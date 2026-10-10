"""Import dell'estratto conto: anteprima, conferma, annullamento.

L'anteprima non scrive niente e non conserva il file: legge, propone e
risponde. La conferma riceve dall'app le righe scelte e le salva tutte insieme.
"""
import uuid
from uuid import UUID
from datetime import date, timedelta

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from sqlalchemy.orm import Session

from app import models, schemas
from app.business_logic import import_categorie, security
from app.business_logic.import_confronto import CATEGORIA, NON_SPESA, Entrata, RigaImport, confronta
from app.business_logic.import_lettura import MAX_BYTE, FileNonLeggibile, Movimento, leggi_estratto
from app.business_logic.import_pulizia import (
    BONIFICO, NON_SPESA as TIPO_NON_SPESA, PAGAMENTO, esercente, motivo, pulisci_nome, tipo_movimento,
)
from app.business_logic.oggi import oggi
from app.database import get_db
from app.routers.expenses import limiti_groq
from app.routers.subscriptions import run_due_renewals
from app.state import limiter, user_or_ip

router = APIRouter(prefix="/import", tags=["import"])

#per ora gli estratti sono di conti italiani: salvare euro come sterline
#darebbe cifre sbagliate senza che nessuno se ne accorga
VALUTA_ESTRATTI = "EUR"
#come schemas.RigaConferma.descrizione: un nome piu' lungo farebbe fallire la conferma
MAX_NOME = 100


def righe_da_movimenti(movimenti: list[Movimento], giorno: date) -> tuple[list[RigaImport], list[Entrata]]:
    righe: list[RigaImport] = []
    entrate: list[Entrata] = []
    for movimento in movimenti:
        #movimenti in attesa con data futura: non sono ancora avvenuti, e la
        #conferma li rifiuterebbe facendo fallire tutto l'import
        if movimento.data > giorno:
            continue
        #la chiave corta riconosce il negozio ("STORNO AMAZON EU" e' il rimborso
        #di "AMZN Mktp IT"), la descrizione lunga fa ricordare l'acquisto
        chiave = esercente(movimento.testo)
        if not movimento.uscita:
            entrate.append(Entrata(movimento.data, chiave, movimento.importo))
            continue
        nome = pulisci_nome(movimento.testo)[:MAX_NOME]
        tipo = tipo_movimento(movimento.testo)
        riga = RigaImport(indice=len(righe), data=movimento.data, testo=movimento.testo,
                          esercente=chiave, tipo=tipo, nome=nome, importo=movimento.importo)
        if tipo == TIPO_NON_SPESA:
            riga.messaggio, riga.selezionata = NON_SPESA, False
        righe.append(riga)
    return righe, entrate


def _riga_json(riga: RigaImport, categorie: dict[int, models.Category]) -> dict:
    categoria = categorie.get(riga.categoria_id) if riga.categoria_id else None
    return {
        "indice": riga.indice,
        "data": riga.data.isoformat(),
        "testo": riga.testo,
        "esercente": riga.esercente,
        "nome": riga.nome,
        "importo": riga.importo,
        "importo_originale": riga.importo_originale,
        "categoria_id": riga.categoria_id,
        "categoria_nome": categoria.name if categoria else None,
        "categoria_gruppo": categoria.parent.name if categoria and categoria.parent else None,
        "messaggio": riga.messaggio,
        "rimborso_data": riga.rimborso_data.isoformat() if riga.rimborso_data else None,
        "rimborso_importo": riga.rimborso_importo,
        "selezionata": riga.selezionata,
    }


@router.post("/anteprima")
@limiti_groq
def anteprima(request: Request, file: UploadFile = File(...), db: Session = Depends(get_db),
              current_user: models.User = Depends(security.get_current_user), giorno: date = Depends(oggi)):
    if current_user.currency != VALUTA_ESTRATTI:
        raise HTTPException(status_code=422, detail="valuta")
    contenuto = file.file.read(MAX_BYTE + 1)
    if len(contenuto) > MAX_BYTE:
        raise HTTPException(status_code=413, detail="troppo_grande")
    try:
        movimenti = leggi_estratto(contenuto, giorno)
    except FileNonLeggibile as errore:
        raise HTTPException(status_code=422, detail=errore.motivo)

    righe, entrate = righe_da_movimenti(movimenti, giorno)
    if not righe:
        raise HTTPException(status_code=422, detail="nessuna_uscita")

    #i rinnovi scaduti devono esistere come spese, o non si riconoscerebbero
    run_due_renewals(db, current_user.id, giorno)

    #i bonifici contengono nomi di persone: non vanno ne' all'AI ne' in memoria.
    #Del bonifico si propone solo il motivo ("cocktail"), se c'e', senza chiave:
    #la memoria degli import lo cercherebbe tra i negozi
    motivi = {r.indice: motivo(r.testo) for r in righe if r.tipo == BONIFICO}
    da_proporre = [(r.nome, r.esercente) for r in righe if r.tipo == PAGAMENTO]
    da_proporre += [(m, None) for m in motivi.values() if m]
    proposte = import_categorie.proponi(da_proporre, current_user.id, db)
    for riga in righe:
        if riga.tipo == PAGAMENTO:
            proposta = proposte[riga.nome]
            riga.nome, riga.categoria_id = proposta.nome[:MAX_NOME], proposta.categoria_id
        elif motivi.get(riga.indice):
            #il nome resta "P2P a ... per cocktail": dal motivo si prende solo la categoria
            riga.categoria_id = proposte[motivi[riga.indice]].categoria_id

    dal, al = min(r.data for r in righe), max(r.data for r in righe)
    esistenti = (
        db.query(models.Expense)
        .filter(models.Expense.user_id == current_user.id,
                models.Expense.date >= dal - timedelta(days=3),
                models.Expense.date <= al + timedelta(days=3))
        .all()
    )
    confronta(righe, entrate, esistenti)
    for riga in righe:
        if riga.messaggio is None and riga.categoria_id is None:
            riga.messaggio = CATEGORIA

    categorie = {c.id: c for c in db.query(models.Category).all()}
    return {
        "codice": str(uuid.uuid4()),
        "dal": dal.isoformat(),
        "al": al.isoformat(),
        "righe": [_riga_json(r, categorie) for r in righe],
    }


@router.post("/conferma", status_code=201)
@limiter.limit("20/minute", key_func=user_or_ip)
def conferma(request: Request, dati: schemas.ImportConferma, db: Session = Depends(get_db),
             current_user: models.User = Depends(security.get_current_user), giorno: date = Depends(oggi)):
    codice = str(dati.codice)
    #un doppio tocco o una richiesta ripetuta dalla rete non deve raddoppiare le
    #spese. Si risponde come la prima volta: se la prima risposta si e' persa,
    #l'app va avanti invece di restare su un errore con le spese gia' salvate
    gia_fatte = (
        db.query(models.Expense.id)
        .filter(models.Expense.user_id == current_user.id, models.Expense.importazione_id == codice)
        .count()
    )
    if gia_fatte:
        return {"codice": codice, "importate": gia_fatte}
    if any(r.data > giorno for r in dati.righe):
        raise HTTPException(status_code=422, detail="data_futura")
    richieste = {r.categoria_id for r in dati.righe}
    valide = {
        id for (id,) in db.query(models.Category.id)
        .filter(models.Category.id.in_(richieste), models.Category.parent_id.isnot(None))
    }
    if richieste - valide:
        raise HTTPException(status_code=422, detail="categoria")

    for r in dati.righe:
        db.add(models.Expense(
            user_id=current_user.id,
            description=r.descrizione.strip(),
            amount=round(r.importo, 2),
            date=r.data,
            category_id=r.categoria_id,
            descrizione_banca=r.testo_banca,
            importazione_id=codice,
        ))
    #un solo commit: o entrano tutte o nessuna
    db.commit()
    return {"codice": codice, "importate": len(dati.righe)}


@router.delete("/{codice}")
@limiter.limit("20/minute", key_func=user_or_ip)
def annulla(request: Request, codice: UUID, db: Session = Depends(get_db),
            current_user: models.User = Depends(security.get_current_user)):
    cancellate = (
        db.query(models.Expense)
        .filter(models.Expense.user_id == current_user.id, models.Expense.importazione_id == str(codice))
        .delete(synchronize_session=False)
    )
    if not cancellate:
        raise HTTPException(status_code=404, detail="Caricamento non trovato")
    db.commit()
    return {"cancellate": cancellate}

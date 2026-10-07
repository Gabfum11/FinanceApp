from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app import models
from app.business_logic import categorization, domande, security
from app.business_logic.oggi import oggi
from app.database import get_db
from app.routers.expenses import limiti_groq, proponi_spesa, SERVIZIO_OCCUPATO
from app.routers.subscriptions import run_due_renewals
from app.state import consuma_quota_groq

router = APIRouter(prefix="/assistant", tags=["assistant"])

#oltre non e' piu' una frase da chat, e ogni carattere finisce nel prompt
MAX_CARATTERI = 500


class QuotaGroq:
    """Da chiamare prima di ogni richiesta a Groq.

    La prima e' gia' stata contata dal decoratore dell'endpoint; dalla seconda
    in poi (una domanda puo' richiederne fino a quattro) si conta qui, sullo
    stesso tetto globale.
    """

    def __init__(self):
        self.gia_contate = 1

    def __call__(self):
        if self.gia_contate:
            self.gia_contate -= 1
            return
        if not consuma_quota_groq():
            raise categorization.ServizioOccupato()


@router.post("/message")
@limiti_groq
def messaggio(request: Request, dati: dict, db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_user), giorno: date = Depends(oggi)):
    """Un messaggio scritto all'assistente: una spesa da registrare o una domanda.

    Risponde {"tipo": "spesa", "spesa": {...}} con la proposta per la card di
    conferma, oppure {"tipo": "risposta", "testo": "..."}.
    """
    testo = str(dati.get("text") or "").strip()
    if not testo or len(testo) > MAX_CARATTERI:
        raise HTTPException(status_code=422, detail="Messaggio vuoto o troppo lungo")

    quota = QuotaGroq()
    try:
        #prima la strada che non tocca l'estrazione delle spese, che funziona
        #bene da sola: le domande riconoscibili non la attraversano nemmeno
        if not domande.sembra_una_domanda(testo):
            quota()
            proposta = proponi_spesa(testo, db, current_user, giorno)
            if proposta is not None:
                return {"tipo": "spesa", "spesa": proposta}
            #non era una spesa: magari una domanda scritta senza punto interrogativo
        #i rinnovi scaduti devono comparire nei totali, come nelle statistiche
        run_due_renewals(db, current_user.id, giorno)
        risposta = domande.rispondi_a_domanda(testo, db, current_user, giorno, quota)
    except categorization.ServizioOccupato:
        raise HTTPException(status_code=503, detail=SERVIZIO_OCCUPATO)

    if risposta is None:
        raise HTTPException(status_code=422, detail="Non sono riuscito a capire la spesa")
    return {"tipo": "risposta", "testo": risposta}

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
MAX_CARATTERI = 500 #oltre viene rifiutato


class QuotaGroq: #è un oggetto perchè serve salvare lo stato per capire quante richieste a Groq sono già state contate per questa domanda.
    """Da chiamare prima di ogni richiesta a Groq.

    La prima e' gia' stata contata dal decoratore dell'endpoint; la seconda
    (una domanda ne usa fino a due) si conta qui, sullo stesso tetto globale.
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
    testo = str(dati.get("text") or "").strip() #messaggio dell'utente, senza spazi iniziali/finali
    if not testo or len(testo) > MAX_CARATTERI:
        raise HTTPException(status_code=422, detail="Messaggio vuoto o troppo lungo")

    quota = QuotaGroq()
    try:
        #la scelta tra spesa e domanda si fa una volta sola, senza il modello:
        #una spesa non riconosciuta non riprova come domanda, che costerebbe
        #una terza richiesta a Groq
        if not domande.sembra_una_domanda(testo):
            quota()
            proposta = proponi_spesa(testo, db, current_user, giorno)
            if proposta is None:
                #l'app risponde "non ho capito" e suggerisce il punto
                #interrogativo, nel caso fosse una domanda
                raise HTTPException(status_code=422, detail="Non sono riuscito a capire la spesa")
            return {"tipo": "spesa", "spesa": proposta}
        #i rinnovi scaduti devono comparire nei totali, come nelle statistiche
        run_due_renewals(db, current_user.id, giorno)
        risposta = domande.rispondi_a_domanda(testo, db, current_user, giorno, quota)
    except categorization.ServizioOccupato:
        raise HTTPException(status_code=503, detail=SERVIZIO_OCCUPATO)

    if risposta is None:
        raise HTTPException(status_code=422, detail="Non sono riuscito a rispondere")
    return {"tipo": "risposta", "testo": risposta}

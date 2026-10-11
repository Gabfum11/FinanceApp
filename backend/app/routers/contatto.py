from fastapi import APIRouter, HTTPException, Request

from app import schemas
from app.business_logic import email_service
from app.logging_config import get_logger
from app.state import limiter

logger = get_logger(__name__)

router = APIRouter(prefix="/contatto", tags=["contatto"])


@router.post("")
#pubblico: chi scrive dalla landing non ha un account. Il limite per IP
#impedisce di usarlo per riempire di email la casella del supporto
@limiter.limit("3/hour")
async def invia_messaggio(request: Request, dati: schemas.MessaggioContatto):
    #un bot ha compilato il campo nascosto: gli si risponde come a tutti,
    #cosi' non capisce di essere stato scartato e non riprova in altro modo
    if dati.sito:
        return {"detail": "Messaggio inviato"}

    #l'invio si aspetta, a differenza dei codici OTP: se non riesce, chi scrive
    #deve saperlo, altrimenti crede di aver ricevuto un "inviato" e aspetta una risposta
    try:
        await email_service.send_contact_email(dati.email, dati.argomento, dati.messaggio, dati.browser)
    except Exception:
        #niente email ne' testo nei log: sono dati personali
        logger.exception("invio del messaggio di contatto non riuscito", extra={"argomento": dati.argomento})
        raise HTTPException(status_code=503, detail="Message not sent")
    return {"detail": "Messaggio inviato"}

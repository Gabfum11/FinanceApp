"""Endpoint chiamati da servizi esterni, non dall'app.

Fuori dalla documentazione delle API e protetti da una chiave condivisa con il
servizio che li chiama: nessun utente deve poterli usare.
"""
import os
import secrets

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.business_logic import reminders

router = APIRouter(prefix="/internal", include_in_schema=False)


def verifica_chiave_cron(x_cron_key: str | None = Header(None)):
    #letta a ogni richiesta: cambiarla su Render non richiede di toccare il codice
    attesa = os.getenv("REMINDER_CRON_KEY")
    if not attesa:
        #senza chiave configurata l'endpoint resterebbe aperto a chiunque
        raise HTTPException(status_code=503, detail="Promemoria non configurati")
    #compare_digest impiega lo stesso tempo qualunque sia la chiave provata:
    #un confronto normale si ferma al primo carattere diverso e la lascia indovinare
    if not x_cron_key or not secrets.compare_digest(x_cron_key, attesa):
        raise HTTPException(status_code=401, detail="Chiave non valida")


@router.post("/send-reminders", dependencies=[Depends(verifica_chiave_cron)])
def send_reminders(db: Session = Depends(get_db)):
    """Chiamato ogni mattina alle 9 da cron-job.org."""
    return reminders.invia_promemoria(db)

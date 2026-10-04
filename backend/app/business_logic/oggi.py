"""Che giorno e' oggi per l'utente.

Il server gira in UTC: all'1 di notte del 1° ottobre in Italia, per lui e'
ancora il 30 settembre. Usando la sua data, una spesa registrata subito dopo
mezzanotte finiva nel giorno (e a volte nel mese) prima, e il budget mostrava
il ciclo sbagliato.

L'app manda con ogni richiesta la data del telefono (intestazione X-Local-Date).
Si accetta solo se dista al massimo un giorno da quella UTC: in qualsiasi fuso
del mondo la data locale e' entro un giorno da UTC, quindi una data diversa e'
un errore o un tentativo di falsarla. Se manca (vecchie versioni dell'app, il
cron dei promemoria), vale l'ora italiana.
"""
from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo

from fastapi import Request

FUSO_ITALIA = ZoneInfo("Europe/Rome")
INTESTAZIONE = "X-Local-Date"


def oggi_in_italia() -> date:
    return datetime.now(FUSO_ITALIA).date()


def data_locale(valore: str | None) -> date:
    """La data mandata dall'app, se credibile; altrimenti quella italiana."""
    if valore:
        try:
            dichiarata = date.fromisoformat(valore.strip())
        except ValueError:
            return oggi_in_italia()
        if abs((dichiarata - datetime.now(timezone.utc).date()).days) <= 1:
            return dichiarata
    return oggi_in_italia()


def oggi(request: Request) -> date:
    """Dipendenza FastAPI: `giorno: date = Depends(oggi)` negli endpoint."""
    return data_locale(request.headers.get(INTESTAZIONE))

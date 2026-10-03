"""Promemoria push per gli abbonamenti che si rinnovano domani.

Li fa partire ogni mattina un cron esterno chiamando /internal/send-reminders.
Prima erano pianificati sul telefono, ma se all'ora prevista era spento l'avviso
andava perso; una push invece resta in coda sui server di Google e arriva alla
riaccensione.

Una notifica per abbonamento: piu' chiara di un riepilogo, si scarta una per
una, e se sono tante Android le raggruppa da solo.
"""
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

import httpx
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app import models
from app.business_logic.formato import formatta_importo
from app.logging_config import get_logger

logger = get_logger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
#Render ragiona in UTC: vicino a mezzanotte "domani" sarebbe il giorno sbagliato
FUSO = ZoneInfo("Europe/Rome")
#deve coincidere con il canale che l'app crea in utils/notifications.ts
CANALE = "abbonamenti"
#limite di Expo per singola richiesta
MESSAGGI_PER_RICHIESTA = 100
FREQUENZE = {"monthly": "mensile", "weekly": "settimanale", "yearly": "annuale"}


def oggi_in_italia() -> date:
    return datetime.now(FUSO).date()


def _secondi_di_validita(rinnovo: date) -> int:
    """Quanto a lungo la push aspetta un telefono spento prima di essere scartata.

    Fino alla fine del giorno del rinnovo: dopo, "si rinnova domani" sarebbe
    falso e confonderebbe piu' di quanto aiuti.
    """
    fine = datetime.combine(rinnovo + timedelta(days=1), time.min, tzinfo=FUSO)
    return max(int((fine - datetime.now(FUSO)).total_seconds()), 0)


def _messaggio(sub: models.Subscriptions, utente: models.User) -> dict:
    frequenza = FREQUENZE.get(sub.frequency, sub.frequency)
    return {
        "to": utente.push_token,
        "title": f"{sub.description} si rinnova domani",
        "body": f"{formatta_importo(sub.amount, utente.currency)} · {frequenza}",
        "data": {"subscriptionId": sub.id},
        "channelId": CANALE,
        "ttl": _secondi_di_validita(sub.next_date),
        #"high" su Android consegna subito anche con il telefono in risparmio energetico
        "priority": "high",
    }


def invia_a_expo(messaggi: list[dict]) -> list[dict]:
    """Consegna i messaggi a Expo e restituisce un esito (ticket) per ciascuno, nello stesso ordine."""
    esiti: list[dict] = []
    with httpx.Client(timeout=15) as client:
        for inizio in range(0, len(messaggi), MESSAGGI_PER_RICHIESTA):
            blocco = messaggi[inizio:inizio + MESSAGGI_PER_RICHIESTA]
            response = client.post(EXPO_PUSH_URL, json=blocco)
            #un rifiuto dell'intera richiesta non deve sembrare un invio riuscito
            response.raise_for_status()
            esiti.extend(response.json()["data"])
    return esiti


def invia_promemoria(db: Session) -> dict:
    """Manda un promemoria per ogni abbonamento attivo che si rinnova domani.

    Le righe restano bloccate fino al commit: se il cron chiama due volte in
    contemporanea, la seconda chiamata aspetta e trova gli avvisi gia' segnati.
    """
    domani = oggi_in_italia() + timedelta(days=1)
    righe = (
        db.query(models.Subscriptions, models.User)
        .join(models.User, models.Subscriptions.user_id == models.User.id)
        .filter(
            models.Subscriptions.is_active.is_(True),
            models.Subscriptions.next_date == domani,
            models.User.push_token.isnot(None),
            or_(
                models.Subscriptions.reminder_sent_for.is_(None),
                models.Subscriptions.reminder_sent_for != domani,
            ),
        )
        .with_for_update(of=models.Subscriptions)
        .all()
    )
    if not righe:
        db.commit()  #rilascia il blocco anche quando non c'e' niente da inviare
        return {"inviati": 0, "falliti": 0, "token_rimossi": 0}

    messaggi = [_messaggio(sub, utente) for sub, utente in righe]
    esiti = invia_a_expo(messaggi)

    inviati = falliti = 0
    token_rimossi: set[int] = set()
    for (sub, utente), esito in zip(righe, esiti):
        if esito.get("status") == "ok":
            sub.reminder_sent_for = domani
            inviati += 1
            continue
        falliti += 1
        errore = (esito.get("details") or {}).get("error")
        if errore == "DeviceNotRegistered":
            #app disinstallata o dati cancellati: continuare a inviare non serve
            utente.push_token = None
            token_rimossi.add(utente.id)
        else:
            #non segnato: la prossima chiamata del cron ci riprova
            logger.warning(
                "promemoria non consegnato",
                extra={"subscription_id": sub.id, "errore": errore or esito.get("message")},
            )

    db.commit()
    return {"inviati": inviati, "falliti": falliti, "token_rimossi": len(token_rimossi)}

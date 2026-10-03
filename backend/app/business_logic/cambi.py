"""Tassi di cambio per le spese e gli abbonamenti in valuta estera.

I tassi sono quelli di riferimento della Banca Centrale Europea, letti da
Frankfurter (gratuito, senza chiave). Si usa il tasso del giorno della spesa:
una cena di marzo pagata in sterline vale quanto valeva a marzo. Nei giorni
senza pubblicazione (fine settimana, festivi) Frankfurter restituisce l'ultimo
disponibile, con la sua data.

Ogni tasso si chiede una volta sola: la BCE non lo cambia dopo averlo pubblicato.
"""
from bisect import bisect_right
from datetime import date
from typing import Iterable

import httpx

from app.logging_config import get_logger

logger = get_logger(__name__)

FRANKFURTER = "https://api.frankfurter.dev/v1"
#la conversione avviene mentre l'utente aspetta il salvataggio: meglio un errore
#chiaro dopo pochi secondi che una schermata ferma
TIMEOUT = 5
#tetto alla memoria: una coppia di valute al giorno e' poco, ma un processo che
#resta acceso mesi non deve crescere senza limite
MAX_TASSI_IN_MEMORIA = 5000

_tassi: dict[tuple[str, str, date], tuple[float, date]] = {}


class CambioNonDisponibile(Exception):
    """Il servizio dei tassi non ha risposto, o ha risposto qualcosa di inatteso."""


def _chiedi_tasso(da: str, a: str, giorno: date) -> tuple[float, date]:
    risposta = httpx.get(f"{FRANKFURTER}/{giorno.isoformat()}", params={"from": da, "to": a}, timeout=TIMEOUT)
    risposta.raise_for_status()
    dati = risposta.json()
    return float(dati["rates"][a]), date.fromisoformat(dati["date"])


def _chiedi_periodo(da: str, a: str, inizio: date, fine: date) -> dict[date, float]:
    #un periodo che parte di sabato include il venerdi' prima: ogni giorno trova un tasso
    risposta = httpx.get(
        f"{FRANKFURTER}/{inizio.isoformat()}..{fine.isoformat()}",
        params={"from": da, "to": a},
        #un periodo lungo e' una risposta grande: piu' tempo che per un tasso solo
        timeout=TIMEOUT * 3,
    )
    risposta.raise_for_status()
    return {date.fromisoformat(giorno): float(valori[a]) for giorno, valori in risposta.json()["rates"].items()}


def precarica(da: str, a: str, giorni: Iterable[date]) -> None:
    """Mette in memoria i tassi di molti giorni con una sola richiesta.

    Serve a convertire tutto lo storico quando l'utente cambia valuta: un tasso
    per spesa vorrebbe dire centinaia di richieste. Dopo, tasso() li trova gia' pronti.
    Puo' sollevare CambioNonDisponibile.
    """
    if da == a:
        return
    oggi = date.today()
    mancanti = {min(g, oggi) for g in giorni} - {g for (d, b, g) in _tassi if (d, b) == (da, a)}
    if not mancanti:
        return
    try:
        serie = _chiedi_periodo(da, a, min(mancanti), max(mancanti))
    except (httpx.HTTPError, KeyError, ValueError, TypeError) as errore:
        logger.warning("tassi del periodo non disponibili", extra={"da": da, "a": a})
        raise CambioNonDisponibile from errore
    pubblicati = sorted(serie)
    if len(_tassi) + len(mancanti) >= MAX_TASSI_IN_MEMORIA:
        _tassi.clear()
    for giorno in mancanti:
        #il tasso valido in un giorno e' l'ultimo pubblicato fino a quel giorno
        posizione = bisect_right(pubblicati, giorno)
        if posizione == 0:
            raise CambioNonDisponibile(f"nessun tasso {da}->{a} prima del {giorno}")
        pubblicato = pubblicati[posizione - 1]
        _tassi[(da, a, giorno)] = (serie[pubblicato], pubblicato)


def tasso(da: str, a: str, giorno: date) -> tuple[float, date]:
    """Quante unita' di `a` vale una unita' di `da` in quel giorno, e la data del tasso usato."""
    if da == a:
        return 1.0, giorno
    #una spesa con data futura (es. un abbonamento che parte domani) usa il
    #tasso piu' recente: per il futuro la BCE non ne ha
    giorno = min(giorno, date.today())
    chiave = (da, a, giorno)
    if chiave not in _tassi:
        try:
            valore = _chiedi_tasso(da, a, giorno)
        except (httpx.HTTPError, KeyError, ValueError, TypeError) as errore:
            logger.warning("tasso di cambio non disponibile", extra={"da": da, "a": a, "giorno": str(giorno)})
            raise CambioNonDisponibile from errore
        if len(_tassi) >= MAX_TASSI_IN_MEMORIA:
            _tassi.clear()
        _tassi[chiave] = valore
    return _tassi[chiave]


def converti(importo: float, da: str, a: str, giorno: date) -> tuple[float, float]:
    """L'importo in `a`, arrotondato al centesimo, e il tasso usato."""
    valore, _ = tasso(da, a, giorno)
    return round(importo * valore, 2), valore

"""Spese pagate in una valuta diversa da quella dell'utente.

amount resta sempre nella valuta dell'utente: budget, statistiche e grafici
sommano cifre omogenee senza sapere nulla di cambi. La cifra vera e il tasso
usato restano accanto, per mostrarli e per ricalcolare se la spesa cambia.
"""
from datetime import date

from app import models
from app.business_logic.cambi import converti


def applica_importo(
    spesa: models.Expense,
    importo: float,
    valuta: str | None,
    valuta_utente: str,
    convertito: float | None = None,
) -> None:
    """Imposta amount (e i campi originali) di una spesa.

    `importo` e' nella valuta `valuta`; senza valuta, o con quella dell'utente,
    la spesa e' normale. `convertito` e' la cifra gia' nota nella valuta
    dell'utente (es. dall'estratto conto): se c'e', non si chiede il tasso.
    Puo' sollevare CambioNonDisponibile.
    """
    if valuta is None or valuta == valuta_utente:
        spesa.amount = importo
        spesa.original_amount = None
        spesa.original_currency = None
        spesa.exchange_rate = None
        return
    if convertito is not None:
        spesa.amount = convertito
        spesa.exchange_rate = round(convertito / importo, 6)
    else:
        spesa.amount, spesa.exchange_rate = converti(importo, valuta, valuta_utente, spesa.date)
    spesa.original_amount = importo
    spesa.original_currency = valuta


def spesa_da_abbonamento(sub: models.Subscriptions, giorno: date, valuta_utente: str) -> models.Expense:
    """La spesa di un rinnovo, convertita con il tasso del giorno del rinnovo.

    Unico punto da cui nascono le spese degli abbonamenti: alla creazione (rinnovi
    arretrati), ai rinnovi automatici e alla conferma di quelli manuali.
    Puo' sollevare CambioNonDisponibile.
    """
    spesa = models.Expense(
        description=sub.description,
        date=giorno,
        category_id=sub.category_id,
        user_id=sub.user_id,
    )
    applica_importo(spesa, sub.amount, sub.currency, valuta_utente)
    return spesa

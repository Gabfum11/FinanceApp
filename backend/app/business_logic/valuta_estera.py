"""Spese pagate in una valuta diversa da quella dell'utente.

amount resta sempre nella valuta dell'utente: budget, statistiche e grafici
sommano cifre omogenee senza sapere nulla di cambi. La cifra vera e il tasso
usato restano accanto, per mostrarli e per ricalcolare se la spesa cambia.
"""
from datetime import date

from app import models
from sqlalchemy.orm import Session

from app.business_logic.cambi import converti, precarica


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
        #la relazione e non l'id: alla creazione l'abbonamento non ne ha ancora
        #uno, e SQLAlchemy lo riempie da solo al salvataggio
        subscription=sub,
    )
    applica_importo(spesa, sub.amount, sub.currency, valuta_utente)
    return spesa


def converti_storico(db: Session, utente: models.User, nuova: str, oggi: date | None = None) -> None:
    """Porta spese e budget dell'utente nella nuova valuta, senza perdere niente.

    Ogni spesa si converte con il tasso del suo giorno, partendo dalla cifra
    vera: quella in valuta estera resta la sua, quella nella vecchia valuta
    dell'utente diventa a sua volta "originale". Si puo' quindi cambiare valuta
    piu' volte senza accumulare arrotondamenti, e tornare indietro riporta le
    cifre di partenza.

    Gli abbonamenti mantengono il prezzo vero: quelli nella vecchia valuta la
    ricordano, e da adesso ogni rinnovo li converte nella nuova.

    Non salva: lo fa chi chiama, tutto insieme. Se un tasso manca solleva
    CambioNonDisponibile prima di aver toccato qualsiasi cifra.
    """
    vecchia = utente.currency
    oggi = oggi or date.today()
    spese = db.query(models.Expense).filter(models.Expense.user_id == utente.id).all()
    abbonamenti = db.query(models.Subscriptions).filter(models.Subscriptions.user_id == utente.id).all()
    storico_budget = db.query(models.BudgetHistory).filter(models.BudgetHistory.user_id == utente.id).all()

    #prima tutti i tassi, una richiesta per valuta di partenza: se ne manca uno
    #ci si ferma qui, con il database ancora intatto
    giorni_per_valuta: dict[str, set[date]] = {}
    for spesa in spese:
        partenza = spesa.original_currency or vecchia
        if partenza != nuova:
            giorni_per_valuta.setdefault(partenza, set()).add(spesa.date)
    if utente.monthly_budget or storico_budget:
        giorni_per_valuta.setdefault(vecchia, set()).add(oggi)
    for partenza, giorni in giorni_per_valuta.items():
        precarica(partenza, nuova, giorni)

    for spesa in spese:
        if spesa.original_currency:
            applica_importo(spesa, spesa.original_amount, spesa.original_currency, nuova)
        else:
            applica_importo(spesa, spesa.amount, vecchia, nuova)
    if utente.monthly_budget:
        #il budget e' un obiettivo per i mesi a venire: vale il cambio di oggi
        utente.monthly_budget = converti(utente.monthly_budget, vecchia, nuova, oggi)[0]
    #anche i budget dei mesi passati, con lo stesso tasso: l'avanzo di un mese
    #e' budget meno spese, e le due cifre devono stare nella stessa valuta
    for riga in storico_budget:
        if riga.amount is not None:
            riga.amount = converti(riga.amount, vecchia, nuova, oggi)[0]
    for sub in abbonamenti:
        prezzo_in = sub.currency or vecchia
        sub.currency = None if prezzo_in == nuova else prezzo_in

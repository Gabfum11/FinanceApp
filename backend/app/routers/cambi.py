from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query

from app import models, schemas
from app.business_logic import security
from app.business_logic.cambi import CambioNonDisponibile, tasso
from app.business_logic.oggi import oggi

router = APIRouter(prefix="/exchange-rate", tags=["exchange-rate"])


@router.get("", response_model=schemas.ExchangeRateOut)
def get_exchange_rate(
    from_currency: schemas.Valuta,
    day: date | None = Query(None, description="giorno della spesa; vuoto = oggi"),
    current_user: models.User = Depends(security.get_current_user),
    giorno: date = Depends(oggi),
):
    """Il tasso per convertire una spesa nella valuta dell'utente.

    Serve solo all'anteprima "≈ 46,20 €" mentre si scrive: la conversione vera
    la fa il server al salvataggio, con lo stesso tasso. Richiede l'accesso,
    cosi' non diventa un servizio di cambi aperto a chiunque.
    """
    try:
        valore, giorno = tasso(from_currency, current_user.currency, day or giorno)
    except CambioNonDisponibile:
        raise HTTPException(status_code=503, detail="Exchange rate unavailable")
    return {
        "from_currency": from_currency,
        "to_currency": current_user.currency,
        "rate": valore,
        "date": giorno,
    }

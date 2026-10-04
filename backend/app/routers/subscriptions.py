from fastapi import APIRouter, Depends, HTTPException
from app import models, schemas
from sqlalchemy.orm import Session
from app.database import get_db
from app.business_logic import security
from app.business_logic.budget import safe_day
from app.business_logic.categorization import attach_category_names
from app.business_logic.cambi import CambioNonDisponibile
from app.business_logic.valuta_estera import spesa_da_abbonamento
from app.logging_config import get_logger
from app.business_logic.oggi import oggi, oggi_in_italia
from datetime import date
from dateutil.relativedelta import relativedelta
router=APIRouter(prefix="/subscriptions", tags=["subscriptions"]) # tags serve per la pagina /docs
logger = get_logger(__name__)

#stesso testo di expenses.CAMBIO_NON_DISPONIBILE: l'app lo riconosce
CAMBIO_NON_DISPONIBILE = "Exchange rate unavailable"


def _valuta_abbonamento(valuta: str | None, valuta_utente: str) -> str | None:
    #la valuta dell'utente si salva come vuota: cosi' se un giorno l'utente la
    #cambia, l'abbonamento segue la nuova invece di restare legato alla vecchia
    return None if valuta == valuta_utente else valuta

#quanti rinnovi arretrati accettiamo di registrare in un colpo solo alla creazione:
#oltre questa soglia e' probabile un errore sulla data (es. anno sbagliato)
MAX_BACKFILL = 12


def advance(d: date, frequency: str, anchor_day: int | None = None) -> date:
    """Avanza di un periodo. anchor_day evita che un abbonamento partito il 31
    resti bloccato al 28 dopo essere passato per febbraio."""
    if frequency == "weekly":
        return d + relativedelta(weeks=1)
    nxt = d + relativedelta(years=1) if frequency == "yearly" else d + relativedelta(months=1)
    if anchor_day is not None:
        nxt = nxt.replace(day=safe_day(nxt.year, nxt.month, anchor_day))
    return nxt

@router.post("/", response_model=schemas.SubscriptionOut)
def create_subscription(subscription: schemas.SubscriptionCreate, db: Session=Depends(get_db),  current_user: models.User=Depends(security.get_current_user), giorno: date = Depends(oggi)):
    if subscription.category_id is not None:
        category = db.query(models.Category).filter(models.Category.id == subscription.category_id).first()
        if category is None:
            raise HTTPException(status_code=404, detail="Category not found")
    today = giorno
    start_date = subscription.start_date or today
    anchor_day = start_date.day if subscription.frequency != "weekly" else None

    #i rinnovi gia' avvenuti tra la data di partenza e oggi diventano spese:
    #le calcoliamo prima di salvare, per poter rifiutare se sono troppi
    due_dates = []
    next_date = start_date
    while next_date <= today:
        due_dates.append(next_date)
        next_date = advance(next_date, subscription.frequency, anchor_day)
        if len(due_dates) > MAX_BACKFILL:
            raise HTTPException(
                status_code=422,
                detail=f"Troppi rinnovi da registrare da quella data (oltre {MAX_BACKFILL}). Scegli una data piu' recente.",
            )

    new_subscription=models.Subscriptions(
        description=subscription.description,
        amount=subscription.amount,
        frequency=subscription.frequency,
        category_id=subscription.category_id,
        user_id=current_user.id,
        next_date=next_date,
        auto_renew=subscription.auto_renew,
        currency=_valuta_abbonamento(subscription.currency, current_user.currency),
    )
    db.add(new_subscription)

    #una spesa per ogni rinnovo gia' avvenuto, datata al giorno in cui e' avvenuto
    #e convertita con il tasso di quel giorno
    try:
        for due_date in due_dates:
            db.add(spesa_da_abbonamento(new_subscription, due_date, current_user.currency))
    except CambioNonDisponibile:
        db.rollback()
        raise HTTPException(status_code=503, detail=CAMBIO_NON_DISPONIBILE)
    db.commit()
    db.refresh(new_subscription)

    attach_category_names(new_subscription)
    return new_subscription

def abbonamenti_bloccati(db: Session, user_id: int):
    """Gli abbonamenti dell'utente, bloccati fino alla fine della transazione.

    La Home chiede spese, budget e statistiche in parallelo, e ognuna di quelle
    richieste esegue i rinnovi: senza blocco tutte leggevano la stessa next_date
    scaduta e registravano ciascuna la propria spesa (tre spese per un rinnovo).
    Con FOR UPDATE la seconda aspetta la prima e trova la data gia' avanzata.
    """
    return (
        db.query(models.Subscriptions)
        .filter(models.Subscriptions.user_id == user_id)
        .with_for_update()
    )


def run_due_renewals(db: Session, user_id: int, oggi_utente: date | None = None) -> list[models.Subscriptions]:
    """Genera le spese dei rinnovi scaduti e restituisce gli abbonamenti dell'utente.
    Va chiamata da ogni endpoint che legge spese o budget: altrimenti i dati sono
    aggiornati solo quando l'utente apre la schermata Abbonamenti.
    oggi_utente: il giorno dell'utente (business_logic/oggi.py); senza, l'ora italiana."""
    today = oggi_utente or oggi_in_italia()
    subscriptions=abbonamenti_bloccati(db, user_id).all()
    valuta_utente = db.query(models.User.currency).filter(models.User.id == user_id).scalar() or "EUR"
    for sub in subscriptions:
        if not sub.is_active:
            continue
        if not sub.auto_renew:
            continue #per non creare spese automatiche per abbonamenti che non si rinnovano automaticamente
        while sub.next_date<=today:
            try:
                new_expense = spesa_da_abbonamento(sub, sub.next_date, valuta_utente)
            except CambioNonDisponibile:
                #senza tasso il rinnovo non si registra e la data non avanza:
                #ci si riprova alla prossima lettura, con lo stesso giorno di cambio
                logger.warning("rinnovo rimandato: cambio non disponibile", extra={"subscription_id": sub.id})
                break
            db.add(new_expense)
            sub.next_date = advance(sub.next_date, sub.frequency)
    #sempre, anche senza rinnovi: il commit rilascia il blocco, che altrimenti
    #durerebbe fino alla fine della richiesta e farebbe aspettare le altre
    db.commit()
    return subscriptions


@router.get("/", response_model=list[schemas.SubscriptionOut])
def list_subscriptions(db:Session=Depends(get_db),current_user: models.User=Depends(security.get_current_user), giorno: date = Depends(oggi)):
    subscriptions = run_due_renewals(db, current_user.id, giorno)
    for sub in subscriptions:
        attach_category_names(sub)
    return subscriptions

@router.patch("/{subscription_id}/toggle") #patch indica una modifica parziale a una risorsa esistente, toggle serve per invertire lo stato attuale del campo is_active
def toggle_subscription(subscription_id:int, db: Session=Depends(get_db), current_user: models.User=Depends(security.get_current_user), giorno: date = Depends(oggi)):
    sub=db.query(models.Subscriptions).filter(models.Subscriptions.user_id== current_user.id, models.Subscriptions.id==subscription_id).first()
    if sub is None:
        raise HTTPException(status_code=404, detail="Subscription not found")
    sub.is_active = not sub.is_active
    if sub.is_active:  # appena riattivato
        sub.next_date = advance(giorno, sub.frequency)
    db.commit()
    return {"detail": "Stato aggiornato", "is_active": sub.is_active}


@router.post("/{subscription_id}/mark-paid", response_model=schemas.SubscriptionOut)
def mark_subscription_paid(subscription_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_user), giorno: date = Depends(oggi)):
    #bloccato come nei rinnovi: due conferme simultanee leggerebbero la stessa
    #next_date e la avanzerebbero una volta sola a fronte di due spese
    sub = db.query(models.Subscriptions).filter(
        models.Subscriptions.id == subscription_id,
        models.Subscriptions.user_id == current_user.id
    ).with_for_update().first()
    if sub is None:
        raise HTTPException(status_code=404, detail="Subscription not found")

    try:
        new_expense = spesa_da_abbonamento(sub, giorno, current_user.currency)
    except CambioNonDisponibile:
        db.rollback()
        raise HTTPException(status_code=503, detail=CAMBIO_NON_DISPONIBILE)
    db.add(new_expense)

    sub.next_date = advance(sub.next_date, sub.frequency)

    db.commit()
    db.refresh(sub)
    attach_category_names(sub)
    return sub  #ritorniamo sub per restituire la data aggiornata del prossimo pagamento

@router.patch("/{subscription_id}", response_model=schemas.SubscriptionOut)
def update_subscription(subscription_id: int, changes: schemas.SubscriptionUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_user), giorno: date = Depends(oggi)):
    sub = db.query(models.Subscriptions).filter(
        models.Subscriptions.id == subscription_id,
        models.Subscriptions.user_id == current_user.id
    ).first()
    if sub is None:
        raise HTTPException(status_code=404, detail="Subscription not found")

    #exclude_unset distingue "campo non inviato" da "campo inviato a null"
    updates = changes.model_dump(exclude_unset=True)

    if updates.get("category_id") is not None:
        category = db.query(models.Category).filter(models.Category.id == updates["category_id"]).first()
        if category is None:
            raise HTTPException(status_code=404, detail="Category not found")

    #una data gia' passata verrebbe subito trasformata in spese arretrate
    #al primo run_due_renewals: non e' quello che chiede chi sposta il rinnovo
    new_next_date = updates.get("next_date")
    if new_next_date is not None and new_next_date <= giorno:
        raise HTTPException(status_code=422, detail="Il prossimo addebito deve essere una data futura")

    new_frequency = updates.get("frequency")
    if "currency" in updates:
        updates["currency"] = _valuta_abbonamento(updates["currency"], current_user.currency)
    for field, value in updates.items():
        setattr(sub, field, value)

    #cambiando periodo la vecchia next_date non e' piu' coerente: la ricalcoliamo
    #da oggi, senza toccare le spese gia' generate. Se pero' l'utente ha indicato
    #anche una data esplicita, e' quella a valere
    if new_frequency is not None and new_next_date is None:
        anchor_day = sub.next_date.day if new_frequency != "weekly" else None
        sub.next_date = advance(giorno, new_frequency, anchor_day)

    db.commit()
    db.refresh(sub)
    attach_category_names(sub)
    return sub

@router.delete("/{subscription_id}")
def delete_subscription(subscription_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_user)):
    sub = db.query(models.Subscriptions).filter(
        models.Subscriptions.id == subscription_id,
        models.Subscriptions.user_id == current_user.id
    ).first()
    if sub is None:
        raise HTTPException(status_code=404, detail="Subscription not found")
    db.delete(sub)
    db.commit()
    return {"detail": "Abbonamento eliminato"}
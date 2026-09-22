from fastapi import APIRouter, Depends, HTTPException
from app import models, schemas
from sqlalchemy.orm import Session
from app.database import get_db
from app.business_logic import security
from app.business_logic.budget import safe_day
from app.business_logic.categorization import attach_category_names
from datetime import date
from dateutil.relativedelta import relativedelta
router=APIRouter(prefix="/subscriptions", tags=["subscriptions"]) # tags serve per la pagina /docs

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
def create_subscription(subscription: schemas.SubscriptionCreate, db: Session=Depends(get_db),  current_user: models.User=Depends(security.get_current_user)):
    if subscription.category_id is not None:
        category = db.query(models.Category).filter(models.Category.id == subscription.category_id).first()
        if category is None:
            raise HTTPException(status_code=404, detail="Category not found")
    today=date.today()
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
        next_date=next_date
    )
    db.add(new_subscription)

    #una spesa per ogni rinnovo gia' avvenuto, datata al giorno in cui e' avvenuto
    for due_date in due_dates:
        db.add(models.Expense(
            description=subscription.description,
            amount=subscription.amount,
            date=due_date,
            category_id=subscription.category_id,
            user_id=current_user.id,
        ))
    db.commit()
    db.refresh(new_subscription)

    attach_category_names(new_subscription)
    return new_subscription

def run_due_renewals(db: Session, user_id: int) -> list[models.Subscriptions]:
    """Genera le spese dei rinnovi scaduti e restituisce gli abbonamenti dell'utente.
    Va chiamata da ogni endpoint che legge spese o budget: altrimenti i dati sono
    aggiornati solo quando l'utente apre la schermata Abbonamenti."""
    today=date.today()
    subscriptions=db.query(models.Subscriptions).filter(models.Subscriptions.user_id==user_id).all()
    changed = False
    for sub in subscriptions:
        if not sub.is_active:
            continue
        if not sub.auto_renew:
            continue #per non creare spese automatiche per abbonamenti che non si rinnovano automaticamente
        while sub.next_date<=today:
            new_expense = models.Expense(
                description=sub.description,
                amount=sub.amount,
                date=sub.next_date,
                category_id=sub.category_id,
                user_id=user_id,
            )
            db.add(new_expense)
            sub.next_date = advance(sub.next_date, sub.frequency)
            changed = True
    if changed:
        db.commit()
    return subscriptions


@router.get("/", response_model=list[schemas.SubscriptionOut])
def list_subscriptions(db:Session=Depends(get_db),current_user: models.User=Depends(security.get_current_user)):
    subscriptions = run_due_renewals(db, current_user.id)
    for sub in subscriptions:
        attach_category_names(sub)
    return subscriptions

@router.patch("/{subscription_id}/toggle") #patch indica una modifica parziale a una risorsa esistente, toggle serve per invertire lo stato attuale del campo is_active
def toggle_subscription(subscription_id:int, db: Session=Depends(get_db), current_user: models.User=Depends(security.get_current_user)):
    sub=db.query(models.Subscriptions).filter(models.Subscriptions.user_id== current_user.id, models.Subscriptions.id==subscription_id).first()
    if sub is None:
        raise HTTPException(status_code=404, detail="Subscription not found")
    sub.is_active = not sub.is_active
    if sub.is_active:  # appena riattivato
        sub.next_date = advance(date.today(), sub.frequency)
    db.commit()
    return {"detail": "Stato aggiornato", "is_active": sub.is_active}


@router.post("/{subscription_id}/mark-paid", response_model=schemas.SubscriptionOut)
def mark_subscription_paid(subscription_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_user)):
    sub = db.query(models.Subscriptions).filter(
        models.Subscriptions.id == subscription_id,
        models.Subscriptions.user_id == current_user.id
    ).first()
    if sub is None:
        raise HTTPException(status_code=404, detail="Subscription not found")

    new_expense = models.Expense(
        description=sub.description,
        amount=sub.amount,
        date=date.today(),
        category_id=sub.category_id,
        user_id=current_user.id,
    )
    db.add(new_expense)

    sub.next_date = advance(sub.next_date, sub.frequency)

    db.commit()
    db.refresh(sub)
    attach_category_names(sub)
    return sub  #ritorniamo sub per restituire la data aggiornata del prossimo pagamento

@router.patch("/{subscription_id}", response_model=schemas.SubscriptionOut)
def update_subscription(subscription_id: int, changes: schemas.SubscriptionUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_user)):
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
    if new_next_date is not None and new_next_date <= date.today():
        raise HTTPException(status_code=422, detail="Il prossimo addebito deve essere una data futura")

    new_frequency = updates.get("frequency")
    for field, value in updates.items():
        setattr(sub, field, value)

    #cambiando periodo la vecchia next_date non e' piu' coerente: la ricalcoliamo
    #da oggi, senza toccare le spese gia' generate. Se pero' l'utente ha indicato
    #anche una data esplicita, e' quella a valere
    if new_frequency is not None and new_next_date is None:
        anchor_day = sub.next_date.day if new_frequency != "weekly" else None
        sub.next_date = advance(date.today(), new_frequency, anchor_day)

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
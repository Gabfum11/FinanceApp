from fastapi import APIRouter, Depends, HTTPException
from app import models, schemas
from sqlalchemy.orm import Session
from app.database import get_db
from app.business_logic import security
from datetime import date
from dateutil.relativedelta import relativedelta
router=APIRouter(prefix="/subscriptions", tags=["subscriptions"]) # tags serve per la pagina /docs

@router.post("/", response_model=schemas.SubscriptionOut)
def create_subscription(subscription: schemas.SubscriptionCreate, db: Session=Depends(get_db),  current_user: models.User=Depends(security.get_current_user)):
    if subscription.category_id is not None:
        category = db.query(models.Category).filter(models.Category.id == subscription.category_id).first()
        if category is None:
            raise HTTPException(status_code=404, detail="Category not found")
    today=date.today()
    if subscription.frequency=="monthly":
        next_date=today+relativedelta(months=1)
    elif subscription.frequency=="weekly":
        next_date = today + relativedelta(weeks=1)
    else:
        next_date = today + relativedelta(years=1)
    new_subscription=models.Subscriptions(
        description=subscription.description,
        amount=subscription.amount,
        frequency=subscription.frequency,
        category_id=subscription.category_id,
        user_id=current_user.id,
        next_date=next_date
    )
    db.add(new_subscription)
    db.commit()
    db.refresh(new_subscription)
    new_expense = models.Expense(
    description=subscription.description,
    amount=subscription.amount,
    date=date.today(),
    category_id=subscription.category_id,
    user_id=current_user.id,
    )
    db.add(new_expense)
    db.commit()

    new_subscription.category_name = new_subscription.category.name if new_subscription.category else None
    return new_subscription

@router.get("/", response_model=list[schemas.SubscriptionOut])
def list_subscriptions(db:Session=Depends(get_db),current_user: models.User=Depends(security.get_current_user)):
    today=date.today()
    subscriptions=db.query(models.Subscriptions).filter(models.Subscriptions.user_id==current_user.id).all()
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
                user_id=current_user.id,
            )
            db.add(new_expense)
            if sub.frequency == "monthly":
                sub.next_date = sub.next_date + relativedelta(months=1)
            elif sub.frequency == "weekly":
                sub.next_date = sub.next_date + relativedelta(weeks=1)
            else:
                sub.next_date = sub.next_date + relativedelta(years=1)
        sub.category_name=sub.category.name if sub.category else None
    db.commit()
    return subscriptions

@router.patch("/{subscription_id}/toggle") #patch indica una modifica parziale a una risorsa esistente, toggle serve per invertire lo stato attuale del campo is_active
def toggle_subscription(subscription_id:int, db: Session=Depends(get_db), current_user: models.User=Depends(security.get_current_user)):
    sub=db.query(models.Subscriptions).filter(models.Subscriptions.user_id== current_user.id, models.Subscriptions.id==subscription_id).first()
    if sub is None:
        raise HTTPException(status_code=404, detail="Subscription not found")
    sub.is_active = not sub.is_active
    if sub.is_active:  # appena riattivato
        today = date.today()
        if sub.frequency == "monthly":
            sub.next_date = today + relativedelta(months=1)
        elif sub.frequency == "weekly":
            sub.next_date = today + relativedelta(weeks=1)
        else:
            sub.next_date = today + relativedelta(years=1)
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

    if sub.frequency == "monthly":
        sub.next_date = sub.next_date + relativedelta(months=1)
    elif sub.frequency == "weekly":
        sub.next_date = sub.next_date + relativedelta(weeks=1)
    else:
        sub.next_date = sub.next_date + relativedelta(years=1)

    db.commit()
    db.refresh(sub)
    sub.category_name = sub.category.name if sub.category else None
    return sub  #ritorniamo sub per restituire la data aggiornata del prossimo pagamento

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
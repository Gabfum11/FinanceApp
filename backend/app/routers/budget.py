
from datetime import date
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app import models, schemas
from app.business_logic import security
from app.business_logic.budget import get_budget_cycle
from app.routers.subscriptions import run_due_renewals

router = APIRouter(prefix="/budget", tags=["budget"])

@router.get("/status")
def get_budget_status(db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_user)):
    run_due_renewals(db, current_user.id) #senza, il budget ignora i rinnovi scaduti
    reference_date = date.today()
    start_day = current_user.budget_start_day or 1
    cycle_start, cycle_end = get_budget_cycle(reference_date, start_day)

    total_spent = db.query(func.sum(models.Expense.amount)).filter(
        models.Expense.user_id == current_user.id,
        models.Expense.date >= cycle_start,
        models.Expense.date <= cycle_end,
    ).scalar() or 0

    return {
        "budget": current_user.monthly_budget,
        "spent": total_spent,
        "remaining": (current_user.monthly_budget - total_spent) if current_user.monthly_budget else None,
        "cycle_start": cycle_start,
        "cycle_end": cycle_end,
    }

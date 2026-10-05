
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app import models, schemas
from app.business_logic import security
from app.business_logic.budget import get_budget_cycle, registra_budget, correggi_budget_periodo
from app.routers.subscriptions import run_due_renewals
from app.business_logic.oggi import oggi

router = APIRouter(prefix="/budget", tags=["budget"])

@router.get("/status")
def get_budget_status(db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_user), giorno: date = Depends(oggi)):
    run_due_renewals(db, current_user.id, giorno) #senza, il budget ignora i rinnovi scaduti
    #il giorno dell'utente: all'1 di notte del 1° il ciclo nuovo e' gia' iniziato
    reference_date = giorno
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


@router.patch("/period")
def set_period_budget(dati: schemas.BudgetPeriodo, db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_user), giorno: date = Depends(oggi)):
    """Il budget di un solo periodo, dalla matita delle statistiche."""
    start_day = current_user.budget_start_day or 1
    #lo stesso periodo che le statistiche mostrano con questo cycle_offset
    riferimento = giorno - relativedelta(months=-dati.cycle_offset)
    inizio, fine = get_budget_cycle(riferimento, start_day)
    if dati.cycle_offset == 0:
        #il periodo in corso vale anche per i successivi: e' il budget attuale
        current_user.monthly_budget = dati.amount
        registra_budget(db, current_user.id, dati.amount, giorno, inizio)
    else:
        _, fine_successivo = get_budget_cycle(fine + timedelta(days=1), start_day)
        correggi_budget_periodo(db, current_user.id, inizio, fine, fine_successivo, dati.amount)
    db.commit()
    return {"cycle_start": inizio, "cycle_end": fine, "budget": dati.amount}


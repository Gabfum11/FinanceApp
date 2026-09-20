from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import List
from app.database import get_db
from app import models, schemas
from app.business_logic import categorization
from app.business_logic import security
from datetime import date
from app.business_logic.budget import get_budget_cycle
from dateutil.relativedelta import relativedelta, MO
from datetime import timedelta
router = APIRouter(prefix="/expenses", tags=["expenses"]) #creazione del router
#prefix = expenses significa che ogni endpoint definito qui avrà automaticamente expenses davanti al suo percorso



@router.post("/", response_model=schemas.ExpenseOut)#crea l'endpoint
#dice a fastAPI: qualunque cosa ritorni questa funzione, filtrala e formattala secondo lo schema expenseout(Pydantic) prima di mandarla al client
def create_expense(expense: schemas.ExpenseCreate, db: Session = Depends(get_db), current_user: models.User=Depends(security.get_current_user)):
    #Depends dice : prima di eseguire questa funzione, esegui get_db e passami il risultato come db
    if expense.category_id is not None:
        category = db.query(models.Category).filter(models.Category.id == expense.category_id).first()
        if category is None:
            raise HTTPException(status_code=404, detail="Category not found")
    new_expense = models.Expense( #viene usato il mmodello creando un'istanza secondo la sua forma
        description=expense.description,
        amount=expense.amount,
        date=expense.date,
        category_id=expense.category_id,
        user_id=current_user.id,  # temporaneo: useremo l'utente autenticato quando avremo il login
    )
    db.add(new_expense) #prepara il salvataggio
    db.commit() #salva davvero
    db.refresh(new_expense) #per avere id e created_at aggiornati
    new_expense.category_name = new_expense.category.name if new_expense.category else None
    return new_expense

@router.get("/", response_model=List[schemas.ExpenseOut])
#dice a FASTAPI : la risposta è una lista di oggetti nella forma expenseOut
def list_expenses(db: Session = Depends(get_db), current_user: models.User=Depends(security.get_current_user)):
    expenses= db.query(models.Expense).filter(models.Expense.user_id==current_user.id).order_by(models.Expense.created_at.desc()).all() #estrae tutte le righe della tabella expense
    for expense in expenses:
        expense.category_name=expense.category.name if expense.category else None
    return expenses

@router.get("/stats", response_model=schemas.StatsOut)
def get_stats(cycle_offset: int = 0, db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_user)):
    reference_date = date.today() - relativedelta(months=-cycle_offset)
    start_day = current_user.budget_start_day or 1
    cycle_start, cycle_end = get_budget_cycle(reference_date, start_day)

    category_expense = db.query(
        models.Category.name, func.sum(models.Expense.amount)
    ).join(
        models.Expense, models.Expense.category_id == models.Category.id
    ).filter(
        models.Expense.user_id == current_user.id,
        models.Expense.date >= cycle_start,
        models.Expense.date <= cycle_end,
    ).group_by(models.Category.name).all()

    return {
        "cycle_start": cycle_start,
        "cycle_end": cycle_end,
        "categories": [{"category_name": name, "total": total} for name, total in category_expense],
    }
@router.get("/weekly-stats", response_model=schemas.WeeklyStatsOut)
def get_weekly_stats(db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_user)):
    today = date.today()
    week_start = today + relativedelta(weekday=MO(-1))  # lunedì di questa settimana relative delta trova il lunedì più vicino al giorno corrente, se oggi è lunedì, restituirà oggi stesso
    week_end = week_start + timedelta(days=6)  # domenica
    daily_expense = db.query(
        models.Expense.date, func.sum(models.Expense.amount)
    ).filter(
        models.Expense.user_id == current_user.id,
        models.Expense.date >= week_start,
        models.Expense.date <= week_end,
    ).group_by(models.Expense.date).all() #il group_by serve per raggruppare le spese per data e sommare gli importi di ciascun giorno

    totals_by_day = {d: total for d, total in daily_expense} #permette di avere un dizionario con chiave=giorno e valore=totale spese di quel giorno
    days = [
        {"date": week_start + timedelta(days=i), "total": totals_by_day.get(week_start + timedelta(days=i), 0)}
        for i in range(7)
    ]

    return {
        "week_start": week_start,
        "week_end": week_end,
        "days": days,
    }

@router.get("/{expense_id}", response_model=schemas.ExpenseOut) #restituisce dati di una spesa specifica
def get_expense(expense_id: int, db: Session = Depends(get_db), current_user: models.User=Depends(security.get_current_user)):
    expense = db.query(models.Expense).filter(models.Expense.id == expense_id, models.Expense.user_id==current_user.id).first()
    if expense is None:
        raise HTTPException(status_code=404, detail="Expense not found")
    return expense

@router.delete("/{expense_id}") 
def delete_expense(expense_id: int, db: Session = Depends(get_db), current_user: models.User=Depends(security.get_current_user)):
    expense = db.query(models.Expense).filter(models.Expense.id == expense_id, models.Expense.user_id==current_user.id).first()
    if expense is None:
        raise HTTPException(status_code=404, detail="Expense not found")
    db.delete(expense)
    db.commit()
    return {"detail": "Expense deleted"}

@router.post("/extract-preview")
def extract_expense_preview(data_expense: dict, db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_user)):
    text = data_expense.get("expenseText", "")
    extracted = categorization.extract_expense_from_text(text)

    if extracted is None:
        raise HTTPException(status_code=422, detail="Non sono riuscito a capire la spesa")

    category_id = categorization.categorize_by_rules(extracted["description"], db)
    if category_id is None:
       altro=db.query(models.Category).filter(models.Category.name=="Altro").first()
       category_id=altro.id if altro else None

    category_name = None
    if category_id is not None:
        category = db.query(models.Category).filter(models.Category.id == category_id).first() #serve per ottenere il nome della categoria
        category_name = category.name if category else None
    return {
        "description": extracted["description"],
        "amount": extracted["amount"],
        # il modello la valorizza solo se il testo dice quando: altrimenti vale oggi
        "date": extracted["date"] or date.today(),
        "category_id": category_id,
        "category_name": category_name,
        "recurring": extracted["recurring"],
        "frequency" : extracted["frequency"]
    }

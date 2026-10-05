
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta
import calendar

from app import models

def safe_day(year, month, day):
    last_day = calendar.monthrange(year, month)[1]
    return min(day, last_day)

def get_budget_cycle(reference_date: date, start_day: int):
    #il confronto va fatto sul giorno effettivo di questo mese, non su start_day
    #grezzo: con start_day=31, a febbraio il ciclo parte il 28, quindi il 28
    #appartiene gia' al nuovo ciclo. Confrontando con 31 ricadrebbe nel precedente
    start_this_month = safe_day(reference_date.year, reference_date.month, start_day)
    if reference_date.day >= start_this_month:
        cycle_start = reference_date.replace(day=start_this_month)
    else:
        prev_month_date = reference_date - relativedelta(months=1)
        safe_d = safe_day(prev_month_date.year, prev_month_date.month, start_day)
        cycle_start = prev_month_date.replace(day=safe_d)
    #la fine e' il giorno prima dell'inizio del ciclo successivo: calcolarla come
    #"+1 mese -1 giorno" lascerebbe buchi quando i mesi hanno lunghezze diverse
    next_month = cycle_start + relativedelta(months=1)
    next_start = next_month.replace(day=safe_day(next_month.year, next_month.month, start_day))
    cycle_end = next_start - timedelta(days=1)
    return cycle_start, cycle_end


def budget_del_ciclo(db, user_id: int, cycle_end: date) -> float | None:
    """Il budget che valeva in un ciclo: l'ultimo impostato entro la sua fine.

    None se in quel ciclo l'utente non aveva un budget."""
    riga = db.query(models.BudgetHistory).filter(
        models.BudgetHistory.user_id == user_id,
        models.BudgetHistory.valid_from <= cycle_end,
    ).order_by(models.BudgetHistory.valid_from.desc(), models.BudgetHistory.id.desc()).first()
    return riga.amount if riga else None


def registra_budget(db, user_id: int, importo: float, giorno: date, cycle_start: date) -> None:
    """Annota un nuovo budget nello storico, valido da giorno (il ciclo in corso).

    Piu' cambi nello stesso ciclo aggiornano la stessa riga: conta solo
    l'ultimo, e lo storico non si riempie di valori che nessun mese ha usato."""
    ultima = db.query(models.BudgetHistory).filter(
        models.BudgetHistory.user_id == user_id,
    ).order_by(models.BudgetHistory.valid_from.desc(), models.BudgetHistory.id.desc()).first()
    if ultima is not None and ultima.valid_from >= cycle_start:
        ultima.amount = importo
        ultima.valid_from = giorno
    else:
        db.add(models.BudgetHistory(user_id=user_id, amount=importo, valid_from=giorno))


def correggi_budget_periodo(db, user_id: int, inizio: date, fine: date, fine_successivo: date, importo: float) -> None:
    """Cambia il budget di un solo periodo passato, da inizio a fine.

    Il periodo dopo eredita il budget dal precedente: senza precauzioni la
    correzione passerebbe anche a lui. Se non ha un budget suo, gli si annota
    quello che aveva finora (anche "nessuno"), cosi' resta com'era."""
    successivo = fine + timedelta(days=1)
    ha_un_suo_budget = db.query(models.BudgetHistory).filter(
        models.BudgetHistory.user_id == user_id,
        models.BudgetHistory.valid_from >= successivo,
        models.BudgetHistory.valid_from <= fine_successivo,
    ).first() is not None
    if not ha_un_suo_budget:
        valeva = budget_del_ciclo(db, user_id, fine_successivo)
        db.add(models.BudgetHistory(user_id=user_id, amount=valeva, valid_from=successivo))
    #i cambi fatti durante il periodo corretto non contano piu': vale solo il nuovo
    db.query(models.BudgetHistory).filter(
        models.BudgetHistory.user_id == user_id,
        models.BudgetHistory.valid_from >= inizio,
        models.BudgetHistory.valid_from <= fine,
    ).delete()
    db.add(models.BudgetHistory(user_id=user_id, amount=importo, valid_from=inizio))

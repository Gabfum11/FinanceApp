
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta
import calendar

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

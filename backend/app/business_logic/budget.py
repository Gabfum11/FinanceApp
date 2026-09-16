
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta
import calendar

def safe_day(year, month, day):
    last_day = calendar.monthrange(year, month)[1]
    return min(day, last_day)

def get_budget_cycle(reference_date: date, start_day: int):
    if reference_date.day >= start_day:
        safe_d = safe_day(reference_date.year, reference_date.month, start_day)
        cycle_start = reference_date.replace(day=safe_d)
    else:
        prev_month_date = reference_date - relativedelta(months=1)
        safe_d = safe_day(prev_month_date.year, prev_month_date.month, start_day)
        cycle_start = prev_month_date.replace(day=safe_d)
    cycle_end = cycle_start + relativedelta(months=1) - timedelta(days=1)
    return cycle_start, cycle_end

from fastapi import Depends, FastAPI, Response, status
from sqlalchemy import text
from sqlalchemy.orm import Session
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler
from app.database import get_db
from app.state import limiter
from app.routers import expenses, categories, auth, subscriptions, budget
app = FastAPI(title="Finance App API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.include_router(expenses.router)
app.include_router(categories.router)
app.include_router(auth.router)
app.include_router(subscriptions.router)
app.include_router(budget.router)
@app.get("/")
def read_root():
    return {"message": "Finance App API is running"}


@app.get("/health")
def health_check(response: Response, db: Session = Depends(get_db)):
    """Dice se l'app e' davvero utilizzabile, non solo se il processo risponde.

    GET / risponde 200 anche con il database irraggiungibile: proviamo una query
    banale, cosi' un monitor esterno se ne accorge prima degli utenti.
    """
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        #503 = il servizio c'e' ma non puo' servire richieste: e' quello che
        #un monitor deve vedere per segnalare un guasto
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"status": "unhealthy", "database": "unreachable"}
    return {"status": "ok", "database": "ok"}


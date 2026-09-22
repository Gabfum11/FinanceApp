from fastapi import Depends, FastAPI, Request, Response, status
from sqlalchemy import text
from sqlalchemy.orm import Session
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler
from app.database import get_db
from app.logging_config import get_logger, setup_logging
from app.state import limiter
from app.routers import expenses, categories, auth, subscriptions, budget

#prima di creare l'app, così anche i messaggi di avvio passano dal formato scelto
setup_logging()
logger = get_logger(__name__)

app = FastAPI(title="Finance App API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.middleware("http")
async def log_richieste_fallite(request: Request, call_next):
    """Registra le richieste che finiscono male.

    Senza, un endpoint che va in errore lascia solo uno stack trace nei log,
    senza dire a quale richiesta corrispondesse. Qui si aggiunge il contesto
    per tutti i 29 endpoint, senza toccarli uno per uno.

    Si registrano solo metodo, percorso ed esito: mai il corpo della richiesta,
    che contiene password e dati personali.
    """
    try:
        response = await call_next(request)
    except Exception:
        #errore non gestito: senza questo blocco resterebbe solo lo stack trace
        logger.exception(
            "richiesta interrotta da un errore",
            extra={"metodo": request.method, "percorso": request.url.path},
        )
        raise

    if response.status_code >= 500:
        logger.error(
            "errore del server",
            extra={
                "metodo": request.method,
                "percorso": request.url.path,
                "stato": response.status_code,
            },
        )
    elif response.status_code >= 400:
        #400-499 sono richieste rifiutate: utili per accorgersi di tentativi
        #di accesso a raffica o di limiti che scattano troppo spesso
        logger.warning(
            "richiesta rifiutata",
            extra={
                "metodo": request.method,
                "percorso": request.url.path,
                "stato": response.status_code,
            },
        )
    return response
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


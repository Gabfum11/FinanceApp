"""Configurazione del logging.

Sostituisce i print() sparsi: ogni riga porta orario, livello e contesto, così
i log di Render diventano filtrabili invece di essere frasi sciolte.

Il livello si regola con la variabile LOG_LEVEL (default INFO). In sviluppo
DEBUG mostra tutto, in produzione WARNING riduce il rumore.
"""
import logging
import os
import sys

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()

#i campi standard di LogRecord: tutto ciò che non è qui è contesto aggiunto da noi
_CAMPI_STANDARD = {
    "name", "msg", "args", "levelname", "levelno", "pathname", "filename",
    "module", "exc_info", "exc_text", "stack_info", "lineno", "funcName",
    "created", "msecs", "relativeCreated", "thread", "threadName",
    "processName", "process", "taskName", "message", "asctime",
}


class ContextFormatter(logging.Formatter):
    """Accoda alla riga i valori passati con extra={...}.

    Senza questo, `logger.warning("fallita", extra={"user_id": 42})` scriverebbe
    solo "fallita" e il contesto andrebbe perso.
    """

    def format(self, record: logging.LogRecord) -> str:
        base = super().format(record)
        contesto = {
            chiave: valore
            for chiave, valore in record.__dict__.items()
            if chiave not in _CAMPI_STANDARD and not chiave.startswith("_")
        }
        if contesto:
            coppie = " ".join(f"{k}={v}" for k, v in contesto.items())
            return f"{base}  {coppie}"
        return base


def setup_logging() -> None:
    """Da chiamare una volta all'avvio, prima di registrare i router."""
    handler = logging.StreamHandler(sys.stdout)  # Render raccoglie stdout
    handler.setFormatter(
        ContextFormatter(
            fmt="%(asctime)s  %(levelname)-8s %(name)s  %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
    )

    root = logging.getLogger()
    root.handlers.clear()  # evita righe duplicate se la funzione viene richiamata
    root.addHandler(handler)
    root.setLevel(LOG_LEVEL)

    #uvicorn registra già ogni richiesta: le nostre righe si aggiungerebbero a quelle
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)

"""Configurazione del logging.

Sostituisce i print() sparsi: ogni riga porta orario, livello e contesto, così
i log di Render diventano filtrabili invece di essere frasi sciolte.

Il livello si regola con la variabile LOG_LEVEL (default INFO). In sviluppo
DEBUG mostra tutto, in produzione WARNING riduce il rumore.
"""
import json
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


def _valore_sicuro(valore) -> str:
    """Il valore cosi' com'e' se e' una parola semplice, altrimenti tra virgolette.

    Alcuni valori arrivano dal client (es. il percorso della richiesta): con
    spazi e "=" potrebbero aggiungere alla riga campi finti come user_id=42, e
    con caratteri di controllo sporcare il terminale. json.dumps li mette tra
    virgolette e trasforma i caratteri invisibili in sequenze leggibili
    (ESC diventa la scritta u001b preceduta dalla barra rovesciata).
    """
    testo = str(valore)
    if testo and testo.isprintable() and not any(c in testo for c in ' ="'):
        return testo
    return json.dumps(testo)


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
            coppie = " ".join(f"{k}={_valore_sicuro(v)}" for k, v in contesto.items())
            return f"{base}  {coppie}"
        return base


def setup_logging() -> None:
    """Da chiamare una volta all'avvio, prima di registrare i router."""
    handler = logging.StreamHandler(sys.stdout)  # Render raccoglie stdout
    handler.setFormatter(
        ContextFormatter(
            fmt="%(asctime)s  %(levelname)-8s %(name)s  %(message)s", #forma della riga mostrata su Render, 8 sono i caratteri riservati al livello (INFO, WARNING, ERROR) per allineare le righe
            datefmt="%Y-%m-%d %H:%M:%S",
        )
    )

    root = logging.getLogger()
    root.handlers.clear()  # evita righe duplicate se la funzione viene richiamata
    root.addHandler(handler)
    root.setLevel(LOG_LEVEL)

    #uvicorn registra già ogni richiesta: le nostre righe si aggiungerebbero a quelle
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    #httpx e httpcore scrivono ogni richiesta con l'URL completo, parametri compresi:
    #finirebbero nei log anche i token. Teniamo solo avvisi ed errori
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)

def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)

"""
Esempio di riga di log:
2026-10-06 09:14:02  WARNING  app.business_logic.cambi  tasso di cambio non disponibile  da=GBP a=EUR giorno=2026-10-05
└── quando ──────┘  └ gravità┘ └── da quale file ─────┘  └── cosa ──────────────────────┘  └── contesto ──────────┘
"""

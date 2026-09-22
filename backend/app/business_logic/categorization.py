from sqlalchemy.orm import Session
from app import models
import os
from groq import Groq
import json
from datetime import date, timedelta
from app.logging_config import get_logger

logger = get_logger(__name__)

groq_client=Groq( api_key=os.environ.get("GROQ_API_KEY"),)

WEEKDAYS_IT = ["lunedi'", "martedi'", "mercoledi'", "giovedi'", "venerdi'", "sabato", "domenica"]


def categorize_by_rules(description: str, db: Session) :
    description_lower = description.lower()
    categories = db.query(models.Category).all()

    for category in categories:
        if not category.keywords:
            continue
        keyword_list = [k.strip().lower() for k in category.keywords.split(",")]
        for keyword in keyword_list:
            if keyword and keyword in description_lower:
                return category.id

    return None

# Il modello sbaglia l'aritmetica sui giorni della settimana ("mercoledi" -> lunedi),
# quindi restituisce solo l'espressione e la data la calcola Python.
RELATIVE_DAYS = {
    "oggi": 0,
    "ieri": 1,
    "altro ieri": 2,
    "l'altro ieri": 2,
}

WEEKDAY_INDEX = {
    "lunedi": 0, "lunedì": 0,
    "martedi": 1, "martedì": 1,
    "mercoledi": 2, "mercoledì": 2,
    "giovedi": 3, "giovedì": 3,
    "venerdi": 4, "venerdì": 4,
    "sabato": 5,
    "domenica": 6,
}


def _resolve_date_expr(raw, today: date) -> date | None:
    """Converte l'espressione del modello in una data. Sconosciuta -> None (= oggi)."""
    if not raw or not isinstance(raw, str):
        return None

    expr = raw.strip().lower()
    # "scorso"/"passato" non cambiano il calcolo: un giorno della settimana e' sempre passato
    for filler in (" scorso", " scorsa", " passato", " passata", "di ", "lo ", "la ", "il "):
        expr = expr.replace(filler, " ")
    expr = " ".join(expr.split())

    if expr in RELATIVE_DAYS:
        return today - timedelta(days=RELATIVE_DAYS[expr])

    if expr in WEEKDAY_INDEX:
        # giorni indietro fino a quel giorno; se coincide con oggi si intende la settimana scorsa
        delta = (today.weekday() - WEEKDAY_INDEX[expr]) % 7
        return today - timedelta(days=delta or 7)

    return None


def extract_expense_from_text(text: str, category_names: list[str] | None = None) -> dict | None:
    today = date.today()
    #la categoria esce dalla stessa chiamata: chiederla a parte costerebbe una seconda richiesta
    if category_names:
        category_rule = (
            'imposta "category" con una tra: ' + ", ".join(f'"{n}"' for n in category_names) + ". "
            "Scegli in base a cosa e' stato comprato. "
            "Se nessuna e' chiaramente adatta, o il testo e' ambiguo, usa null. "
        )
    else:
        category_rule = '"category" deve essere sempre null. '
    try:
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Estrai da questo testo una spesa. Rispondi SOLO con un JSON valido, "
                        'nel formato esatto {"description": "...", "amount": 0.0, "date_expr": null, "category": null, "recurring": false,"frequency": null}. '
                        + category_rule +
                        'se il testo indica che la spesa si ripete periodicamente (es. "al mese", "ogni settimana", "abbonamento"),'
                        'imposta "recurring":true e "frequency" con uno tra "monthly", "weekly", "yearly". '
                        "se il testo dice quando e' avvenuta la spesa, copia quell'espressione in "
                        '"date_expr" come appare, senza convertirla in data e senza calcoli. '
                        'Valori ammessi per "date_expr": "oggi", "ieri", "altro ieri", '
                        '"lunedi", "martedi", "mercoledi", "giovedi", "venerdi", "sabato", "domenica". '
                        "Se il giorno e' seguito da \"scorso\" usa comunque solo il nome del giorno: "
                        '"sabato scorso" -> "date_expr": "sabato". '
                        "se il testo non dice quando, o usa un'espressione diversa da queste, "
                        'lascia "date_expr": null. '
                        "la regola vale anche quando \"recurring\" e' true: in quel caso "
                        "\"date_expr\" indica da quando parte l'abbonamento. "
                        "Usa i nomi di categoria esattamente come elencati sopra; "
                        "gli esempi che seguono mostrano solo la forma, non i nomi ammessi. "
                        "Non aggiungere altro testo, solo il JSON. "
                        'Esempio di forma: {"description": "Pizza", "amount": 15.0, "date_expr": null, "category": "Cibo"}. '
                        'Esempio di forma: {"description": "Spesa", "amount": 40.0, "date_expr": "ieri", "category": "Spesa"}. '
                        'Esempio di forma: {"description": "Visita dottore", "amount": 20.0, "date_expr": "mercoledi", "category": "Salute"}. '
                        'Esempio di forma: {"description": "Palestra", "amount": 60.0, "date_expr": null, "category": null, "recurring": true, "frequency": "monthly"}. '
                        'se il testo non descrive una spesa, mancano dei dati, oppure contiene parole generiche, rispondi esattamente con '
                        '{"error": "not_an_expense"}'
                    ),
                },
                {"role": "user", "content": text},
            ],
            model="openai/gpt-oss-20b",
            #gpt-oss è un modello di reasoning: i token del ragionamento interno rientrano nel
            #budget di max_tokens. Con un limite troppo basso il budget si esaurisce prima che
            #il modello scriva il JSON e content torna vuoto o troncato (finish_reason="length").
            reasoning_effort="low",
            max_tokens=1024,
            response_format={"type": "json_object"},
        )
        raw = chat_completion.choices[0].message.content.strip()
        parsed = json.loads(raw) #converte la risposta in un dizionario python
        if "error" in parsed:
            return None
        description = parsed.get("description", "").strip() #se groq per qualche motivo non include la descrizione, essa è "" di default
        amount = float(parsed.get("amount"))
        recurring= bool(parsed.get("recurring", False))
        frequency= parsed.get("frequency")
        if not description or amount is None or amount <= 0:
            return None
        valid_frequencies=["monthly","weekly", "yearly"]
        if recurring and frequency not in valid_frequencies:
            frequency=None
            recurring=False
        expense_date = _resolve_date_expr(parsed.get("date_expr"), today)
        #accettiamo solo un nome che esiste davvero: il modello puo' inventarne
        category = parsed.get("category")
        if not isinstance(category, str) or not category_names:
            category = None
        else:
            match = next((n for n in category_names if n.lower() == category.strip().lower()), None)
            category = match
        return {
            "description":description,
            "amount": amount,
            "date": expense_date,
            "category": category,
            "recurring":recurring,
            "frequency": frequency
        }
    except Exception:
        #l'utente riceve solo "non ho capito": senza questa riga un guasto di
        #Groq sarebbe indistinguibile da una frase scritta male
        logger.exception("estrazione della spesa non riuscita")
        return None
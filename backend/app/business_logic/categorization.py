from sqlalchemy.orm import Session
from app import models
import os
from groq import Groq
import json

groq_client=Groq( api_key=os.environ.get("GROQ_API_KEY"),)

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

def categorize_by_ai(description: str, db: Session) -> int | None:
    categories = db.query(models.Category).all()
    category_names = [c.name for c in categories]

    try:
        chat_completion = groq_client.chat.completions.create(
            messages=[
              {"role": "user", "content": f"Classifica questa spesa {description} in una di queste categorie:{','.join(category_names)} . Rispondi solo col nome categoria."
               'se non sei sicuro sulla categoria di appartenenza (es. è un nome proprio, un termine ambiguo o senza relazione chiara con le categorie)'
               'rispondi esattamente con : nessuna'}
            #il join prende una lista e la unisce in una singola stringa, inserendo un separatore scelto tra ogni elemento
            ],
            model="openai/gpt-oss-20b",
            reasoning_effort="low",
            max_tokens=512, #include i token di reasoning, non solo il nome della categoria
        )
        predicted_name = chat_completion.choices[0].message.content.strip() #strip rimuove eventuali spazi superfluie altri caratteri simili come tab e capo all'inizio e alla finefine
        if predicted_name=='nessuna':
            return None
    except Exception:
        return None

    for category in categories:
        if category.name.lower() == predicted_name.lower():
            return category.id

    return None

def extract_expense_from_text(text: str) -> dict | None:
    try:
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Estrai da questo testo una spesa. Rispondi SOLO con un JSON valido, "
                        'nel formato esatto {"description": "...", "amount": 0.0, "recurring": false,"frequency": null}. '
                        'se il testo indica che la spesa si ripete periodicamente (es. "al mese", "ogni settimana", "abbonamento"),'
                        'imposta "recurring":true e "frequency" con uno tra "monthly", "weekly", "yearly". '
                        "Non aggiungere altro testo, solo il JSON. "
                        'Esempio: input "Pizza 15 euro" -> output {"description": "Pizza", "amount": 15.0}. '
                        'Esempio: input "palestra 60 euro al mese" -> output {"description": "Palestra", "amount": 60.0, "recurring": true, "frequency": "monthly"}. '
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
        return {
            "description":description,
            "amount": amount,
            "recurring":recurring,
            "frequency": frequency
        }
    except Exception as e:
        print(f"Errore in extract_expense_from_text: {e}")
        return None
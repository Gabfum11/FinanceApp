"""Risposte alle domande sulle proprie spese ("quanto ho speso in ristoranti a settembre?").

Il modello non legge mai le spese: sceglie una delle funzioni qui sotto con i
suoi parametri, i conti li fa il database filtrando sempre per l'utente, e il
modello scrive la risposta con i numeri ricevuti. Cosi' i totali sono esatti
(un modello che somma decine di cifre sbaglia) e nessuna domanda puo' arrivare
ai dati di un altro account.
"""
import json
import re
from collections import defaultdict
from datetime import date, timedelta
from typing import Callable

from groq import RateLimitError
from sqlalchemy.orm import Session, aliased

from app import models
from app.business_logic import categorization
from app.business_logic.budget import get_budget_cycle
from app.logging_config import get_logger

logger = get_logger(__name__)

MODELLO = "openai/gpt-oss-20b"
#giri di funzioni prima della risposta finale: "confronta settembre e agosto"
#ne usa uno con due chiamate, raramente serve di piu'. Ogni giro e' una
#richiesta a Groq, quindi il tetto e' anche un tetto di costo
MAX_GIRI = 3
MAX_CHIAMATE_PER_GIRO = 4
#un periodo piu' lungo non serve a nessuna domanda sensata e allungherebbe le query
MAX_GIORNI_PERIODO = 3660
MAX_ELENCO = 15

# ---------------------------------------------------------------------------
# Spesa o domanda?
# ---------------------------------------------------------------------------

#prime parole tipiche di una domanda o di una richiesta. "ho speso" manca di
#proposito: apre sia "ho speso 20 euro al bar" sia "ho speso troppo?"
_PAROLE_DOMANDA = {
    "quanto", "quanta", "quanti", "quante", "qual", "quale", "quali", "quando",
    "dove", "come", "perche", "perché", "perchè", "cosa", "che", "chi",
    "mostrami", "dimmi", "elenca", "confronta", "riassumi", "riepilogo",
    "how", "what", "which", "when", "where", "why", "who", "show", "list",
    "tell", "compare", "summarize", "summary", "did", "do", "does", "am",
    "is", "are", "can", "could",
}


def sembra_una_domanda(testo: str) -> bool:
    """Prima scelta, senza chiamare il modello: costa zero e non tocca l'estrazione.

    I casi che sfuggono non vanno persi: una frase che l'estrazione non
    riconosce come spesa passa comunque alle domande.
    """
    pulito = testo.strip().lower()
    if pulito.endswith("?"):
        return True
    parole = re.findall(r"[a-zàèéìòù']+", pulito)
    return bool(parole) and parole[0].strip("'") in _PAROLE_DOMANDA


# ---------------------------------------------------------------------------
# Le funzioni che il modello puo' chiamare
# ---------------------------------------------------------------------------

class ParametroNonValido(Exception):
    """Torna al modello come {"errore": ...}: puo' correggersi al giro dopo."""


def _periodo(da, a) -> tuple[date, date]:
    try:
        inizio, fine = date.fromisoformat(str(da)), date.fromisoformat(str(a))
    except ValueError:
        raise ParametroNonValido("date nel formato AAAA-MM-GG, per esempio 2026-09-01")
    if fine < inizio:
        raise ParametroNonValido("'a' viene prima di 'da'")
    if (fine - inizio).days > MAX_GIORNI_PERIODO:
        raise ParametroNonValido("periodo troppo lungo: al massimo 10 anni")
    return inizio, fine


def _categorie_cercate(db: Session, nome) -> set[int] | None:
    """Gli id delle sottocategorie che corrispondono al nome; None = nessun filtro.

    Un gruppo ("Casa") vale per tutte le sue sottocategorie: le spese puntano
    sempre a una sottocategoria, mai al gruppo.
    """
    if not nome:
        return None
    cercato = str(nome).strip().lower()
    categorie = db.query(models.Category).all()
    for c in categorie:
        if c.name.lower() == cercato:
            figlie = {f.id for f in categorie if f.parent_id == c.id}
            return figlie or {c.id}
    #il modello vede solo i gruppi: l'elenco completo gli arriva qui, quando serve
    raise ParametroNonValido(
        "categoria sconosciuta, usa uno di questi nomi esatti: "
        + ", ".join(sorted(c.name for c in categorie))
    )


def _righe(db: Session, utente: models.User, inizio: date, fine: date, categoria=None, testo=None):
    """Le spese dell'utente nel periodo, con sottocategoria e gruppo."""
    padre = aliased(models.Category)
    query = (
        db.query(models.Expense.date, models.Expense.description, models.Expense.amount,
                 models.Category.name, padre.name)
        .outerjoin(models.Category, models.Expense.category_id == models.Category.id)
        .outerjoin(padre, models.Category.parent_id == padre.id)
        .filter(
            models.Expense.user_id == utente.id,
            models.Expense.date >= inizio,
            models.Expense.date <= fine,
        )
    )
    ids = _categorie_cercate(db, categoria)
    if ids is not None:
        query = query.filter(models.Expense.category_id.in_(ids))
    if testo:
        #% e _ scritti dall'utente vanno cercati come caratteri, non come jolly
        letterale = str(testo).replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        query = query.filter(models.Expense.description.ilike(f"%{letterale}%", escape="\\"))
    return query.all()


def totale_spese(db, utente, giorno, da, a, categoria=None, testo=None):
    inizio, fine = _periodo(da, a)
    righe = _righe(db, utente, inizio, fine, categoria, testo)
    return {
        "da": inizio.isoformat(), "a": fine.isoformat(),
        "totale": round(sum(r.amount for r in righe), 2),
        "numero_spese": len(righe),
    }


def spese_per_categoria(db, utente, giorno, da, a):
    inizio, fine = _periodo(da, a)
    gruppi: dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))
    for r in _righe(db, utente, inizio, fine):
        sotto = r[3] or "Senza categoria"
        gruppi[r[4] or sotto][sotto] += r.amount
    elenco = sorted(
        ({"gruppo": g, "totale": round(sum(s.values()), 2),
          #le prime cinque bastano a spiegare un gruppo e tengono corta la risposta
          "categorie": [{"categoria": n, "totale": round(t, 2)}
                        for n, t in sorted(s.items(), key=lambda x: -x[1])[:5]]}
         for g, s in gruppi.items()),
        key=lambda x: -x["totale"],
    )
    return {"da": inizio.isoformat(), "a": fine.isoformat(),
            "totale": round(sum(g["totale"] for g in elenco), 2), "gruppi": elenco}


def elenco_spese(db, utente, giorno, da, a, categoria=None, testo=None, ordine="importo", limite=10):
    inizio, fine = _periodo(da, a)
    righe = _righe(db, utente, inizio, fine, categoria, testo)
    if ordine == "data":
        righe.sort(key=lambda r: r.date, reverse=True)
    else:
        righe.sort(key=lambda r: r.amount, reverse=True)
    try:
        limite = max(1, min(int(limite), MAX_ELENCO))
    except (TypeError, ValueError):
        limite = 10
    return {
        "numero_spese": len(righe),
        "spese": [
            {"data": r.date.isoformat(), "descrizione": r.description,
             "importo": round(r.amount, 2), "categoria": r[3]}
            for r in righe[:limite]
        ],
    }


def totali_mensili(db, utente, giorno, da, a, categoria=None):
    inizio, fine = _periodo(da, a)
    mesi: dict[str, float] = defaultdict(float)
    #anche i mesi senza spese: "a luglio zero" e' un'informazione, non un buco
    cursore = inizio.replace(day=1)
    while cursore <= fine:
        mesi[cursore.strftime("%Y-%m")] = 0.0
        cursore = (cursore + timedelta(days=32)).replace(day=1)
    for r in _righe(db, utente, inizio, fine, categoria):
        mesi[r.date.strftime("%Y-%m")] += r.amount
    return {"mesi": [{"mese": m, "totale": round(t, 2)} for m, t in sorted(mesi.items())]}


def stato_budget(db, utente, giorno):
    inizio, fine = get_budget_cycle(giorno, utente.budget_start_day or 1)
    speso = round(sum(r.amount for r in _righe(db, utente, inizio, fine)), 2)
    budget = utente.monthly_budget
    return {
        "inizio_ciclo": inizio.isoformat(), "fine_ciclo": fine.isoformat(),
        "budget": budget, "speso": speso,
        "rimanente": round(budget - speso, 2) if budget is not None else None,
        "giorni_rimanenti": (fine - giorno).days + 1,
    }


#quante volte al mese si ripete un addebito, per stimare il costo mensile
_VOLTE_AL_MESE = {"monthly": 1.0, "weekly": 52 / 12, "yearly": 1 / 12}


def abbonamenti_attivi(db, utente, giorno):
    righe = db.query(models.Subscriptions).filter(
        models.Subscriptions.user_id == utente.id,
        models.Subscriptions.is_active.is_(True),
    ).order_by(models.Subscriptions.next_date).all()
    elenco, totale, altre_valute = [], 0.0, 0
    for s in righe:
        mensile = s.amount * _VOLTE_AL_MESE.get(s.frequency, 1.0)
        if s.currency in (None, utente.currency):
            totale += mensile
        else:
            #importi in valute diverse non si sommano: lo diciamo invece di sbagliare
            altre_valute += 1
        elenco.append({
            "descrizione": s.description, "importo": round(s.amount, 2),
            "valuta": s.currency or utente.currency, "frequenza": s.frequency,
            "prossimo_addebito": s.next_date.isoformat(),
        })
    return {"abbonamenti": elenco, "costo_mensile_stimato": round(totale, 2),
            "abbonamenti_in_altre_valute_esclusi_dal_totale": altre_valute}


_PERIODO = {
    "da": {"type": "string", "description": "primo giorno incluso, AAAA-MM-GG"},
    "a": {"type": "string", "description": "ultimo giorno incluso, AAAA-MM-GG"},
}
_CATEGORIA = {"type": "string", "description": "nome di un gruppo o di una sottocategoria, in italiano"}
_TESTO = {"type": "string", "description": "parola cercata nella descrizione, es. un negozio"}


def _strumento(nome, descrizione, proprieta=None, obbligatori=()):
    return {"type": "function", "function": {
        "name": nome, "description": descrizione,
        "parameters": {"type": "object", "properties": proprieta or {}, "required": list(obbligatori)},
    }}


STRUMENTI = [
    _strumento("totale_spese", "Totale speso e numero di spese in un periodo, filtrabile.",
               {**_PERIODO, "categoria": _CATEGORIA, "testo": _TESTO}, ("da", "a")),
    _strumento("spese_per_categoria", "Totali del periodo divisi per gruppo e sottocategoria.",
               _PERIODO, ("da", "a")),
    _strumento("elenco_spese", "Le singole spese del periodo, le piu' alte o le piu' recenti.",
               {**_PERIODO, "categoria": _CATEGORIA, "testo": _TESTO,
                "ordine": {"type": "string", "enum": ["importo", "data"]},
                "limite": {"type": "integer", "description": f"massimo {MAX_ELENCO}"}},
               ("da", "a")),
    _strumento("totali_mensili", "Totale di ogni mese del periodo, per andamenti e confronti.",
               {**_PERIODO, "categoria": _CATEGORIA}, ("da", "a")),
    _strumento("stato_budget", "Budget del ciclo in corso: speso, rimanente, giorni alla fine."),
    _strumento("abbonamenti_attivi", "Abbonamenti attivi con costo e prossimo addebito."),
]

_FUNZIONI = {
    "totale_spese": totale_spese,
    "spese_per_categoria": spese_per_categoria,
    "elenco_spese": elenco_spese,
    "totali_mensili": totali_mensili,
    "stato_budget": stato_budget,
    "abbonamenti_attivi": abbonamenti_attivi,
}


def esegui_strumento(nome: str, argomenti: str, db: Session, utente: models.User, giorno: date) -> dict:
    """Esegue una chiamata del modello. Gli errori tornano a lui, non all'utente."""
    funzione = _FUNZIONI.get(nome)
    if funzione is None:
        return {"errore": f"funzione inesistente: {nome}"}
    try:
        parametri = json.loads(argomenti or "{}")
        if not isinstance(parametri, dict):
            raise ValueError
    except ValueError:
        return {"errore": "parametri non in JSON valido"}
    try:
        #l'utente e il giorno li mettiamo noi: il modello non li sceglie
        return funzione(db, utente, giorno, **parametri)
    except ParametroNonValido as e:
        return {"errore": str(e)}
    except TypeError:
        return {"errore": "parametri sbagliati per questa funzione"}


# ---------------------------------------------------------------------------
# Il dialogo con il modello
# ---------------------------------------------------------------------------

def _istruzioni(db: Session, utente: models.User, giorno: date) -> str:
    inizio, fine = get_budget_cycle(giorno, utente.budget_start_day or 1)
    #solo i gruppi: le 47 sottocategorie allungherebbero ogni richiesta, e
    #arrivano comunque al modello se sbaglia un nome
    gruppi = ", ".join(sorted(
        c.name for c in db.query(models.Category).filter(models.Category.parent_id.is_(None))
    ))
    return (
        "Sei l'assistente di TrackIt, un'app per tenere traccia delle spese personali. "
        "Rispondi alle domande dell'utente sulle sue spese chiamando le funzioni disponibili. "
        "Non inventare mai cifre: usa solo i numeri restituiti dalle funzioni, e non rifare "
        "somme che una funzione puo' calcolare. Non nominare mai spese, negozi, date o "
        "categorie che non compaiono nei risultati: se quelli che hai non bastano a "
        "rispondere, chiama un'altra funzione (per esempio spese_per_categoria per "
        "sapere in cosa si spende di piu', elenco_spese per le singole spese). "
        f"Oggi e' {giorno.isoformat()} ({categorization.WEEKDAYS_IT[giorno.weekday()]}). "
        f"Il ciclo di budget in corso va dal {inizio.isoformat()} al {fine.isoformat()}. "
        f"Gli importi sono in {utente.currency}. "
        "Un mese senza anno e' l'ultimo non futuro; \"questo mese\" e' il mese di calendario in corso. "
        f"Gruppi di categorie: {gruppi}. "
        #istruzioni in italiano tirano la risposta verso l'italiano: la regola
        #sulla lingua e' ripetuta in inglese, altrimenti chi scrive in inglese
        #riceve risposte in italiano
        "Rispondi nella stessa lingua del messaggio dell'utente "
        "(always answer in the language of the user's message: English question, English answer), "
        "in al massimo quattro frasi di testo semplice: niente markdown, elenchi puntati o tabelle. "
        "Importi con due decimali e la valuta. Quando citi una singola spesa, di' anche "
        "cos'era e quando. "
        "Se il messaggio non riguarda le spese dell'utente, rispondi in una frase che puoi "
        "registrare una spesa (per esempio \"Pizza 15 euro\") o rispondere a domande sulle "
        "spese (per esempio \"Quanto ho speso questo mese?\")."
    )


def _chiama_modello(messaggi: list, con_strumenti: bool):
    return categorization.groq_client.chat.completions.create(
        model=MODELLO,
        messages=messaggi,
        tools=STRUMENTI,
        #all'ultimo giro il modello deve rispondere con quello che ha
        tool_choice="auto" if con_strumenti else "none",
        reasoning_effort="low",
        max_tokens=1024,
    ).choices[0].message


def rispondi_a_domanda(
    testo: str, db: Session, utente: models.User, giorno: date, quota: Callable[[], None],
) -> str | None:
    """La risposta da mostrare in chat, o None se il modello non ne ha data una.

    quota() viene chiamata prima di ogni richiesta a Groq e solleva
    ServizioOccupato quando il tetto globale e' raggiunto.
    """
    messaggi = [
        {"role": "system", "content": _istruzioni(db, utente, giorno)},
        {"role": "user", "content": testo},
    ]
    try:
        for giro in range(MAX_GIRI + 1):
            quota()
            messaggio = _chiama_modello(messaggi, con_strumenti=giro < MAX_GIRI)
            chiamate = (messaggio.tool_calls or [])[:MAX_CHIAMATE_PER_GIRO]
            if not chiamate:
                risposta = (messaggio.content or "").strip()
                return risposta or None
            messaggi.append({
                "role": "assistant",
                "content": messaggio.content or "",
                "tool_calls": [
                    {"id": c.id, "type": "function",
                     "function": {"name": c.function.name, "arguments": c.function.arguments}}
                    for c in chiamate
                ],
            })
            for c in chiamate:
                risultato = esegui_strumento(c.function.name, c.function.arguments, db, utente, giorno)
                messaggi.append({
                    "role": "tool", "tool_call_id": c.id,
                    "content": json.dumps(risultato, ensure_ascii=False),
                })
        return None
    except RateLimitError:
        logger.warning("limite di frequenza di Groq raggiunto")
        raise categorization.ServizioOccupato()
    except categorization.ServizioOccupato:
        raise
    except Exception:
        logger.exception("risposta alla domanda non riuscita")
        return None

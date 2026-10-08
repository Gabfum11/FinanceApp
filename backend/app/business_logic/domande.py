"""Risposte alle domande sulle proprie spese ("quanto ho speso in ristoranti a settembre?").

Il modello non legge mai le spese: sceglie una delle funzioni qui sotto con i
suoi parametri, i conti li fa il database filtrando sempre per l'utente, e il
modello scrive la risposta con i numeri ricevuti. Cosi' i totali sono esatti
(un modello che somma decine di cifre sbaglia) e nessuna domanda puo' arrivare
ai dati di un altro account.
"""
import inspect
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

#il 20b, usato per l'estrazione delle spese, qui sbagliava piu' spesso la
#scelta delle funzioni e scriveva un italiano poco naturale ("nel settembre")
MODELLO = "openai/gpt-oss-120b"
#funzioni eseguite per una domanda: il modello le chiede tutte insieme nella
#prima richiesta a Groq, perche' nella seconda deve rispondere
MAX_FUNZIONI = 4
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
    """Spesa o domanda, deciso senza chiamare il modello: costa zero.

    La scelta e' definitiva: una frase mandata all'estrazione che non risulta
    una spesa non passa poi alle domande, perche' costerebbe una terza
    richiesta a Groq. Per questo i casi dubbi pendono verso la domanda.
    """
    pulito = testo.strip().lower()
    if pulito.endswith("?"):
        return True
    #una spesa ha sempre un importo: senza cifre non puo' esserlo
    #("spese di settembre", "ciao")
    if not re.search(r"\d", pulito):
        return True
    parole = re.findall(r"[a-zàèéìòù']+", pulito)
    return bool(parole) and parole[0].strip("'") in _PAROLE_DOMANDA


# ---------------------------------------------------------------------------
# Le funzioni che il modello puo' chiamare
# ---------------------------------------------------------------------------

class ParametroNonValido(Exception):
    """Torna al modello come {"errore": ...}: nella risposta dice cosa non ha trovato."""


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
    #"Cibo: Pranzi e cene": il modello a volte copia anche il gruppo, come
    #nell'elenco che riceve. Conta il nome dopo i due punti
    cercato = str(nome).split(":")[-1].strip().lower()
    categorie = db.query(models.Category).all()
    for c in categorie:
        if c.name.lower() == cercato:
            figlie = {f.id for f in categorie if f.parent_id == c.id}
            return figlie or {c.id}
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


def _filtri(categoria, testo) -> dict:
    """I filtri usati, ripetuti nel risultato.

    Senza, il modello riceve "totale: 77.5" e non sa che e' solo dei
    ristoranti: rispondeva di non avere il dato per categoria.
    """
    return {"categoria": categoria or "tutte", **({"testo_cercato": testo} if testo else {})}


def totale_spese(db, utente, giorno, da, a, categoria=None, testo=None):
    inizio, fine = _periodo(da, a)
    righe = _righe(db, utente, inizio, fine, categoria, testo)
    return {
        "da": inizio.isoformat(), "a": fine.isoformat(), **_filtri(categoria, testo),
        "totale": round(sum(r.amount for r in righe), 2),
        "numero_spese": len(righe),
    }


#oltre, un confronto non si legge piu' in quattro frasi
MAX_PERIODI = 6


def totali_per_periodi(db, utente, giorno, periodi, categoria=None, testo=None):
    """Piu' periodi in una sola funzione: il modello chiede raramente due funzioni insieme."""
    if not isinstance(periodi, list) or not periodi:
        raise ParametroNonValido("'periodi' e' un elenco di {\"da\": ..., \"a\": ...}")
    risultati = []
    for p in periodi[:MAX_PERIODI]:
        if not isinstance(p, dict):
            raise ParametroNonValido("ogni periodo e' {\"da\": ..., \"a\": ...}")
        risultati.append(totale_spese(db, utente, giorno, p.get("da"), p.get("a"), categoria, testo))
    return {"periodi": risultati}


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
    #detta esplicitamente: confrontando da solo le cifre, il modello indicava a
    #volte come piu' alta una categoria piu' piccola (77,50 contro 80,00)
    tutte = [(c["categoria"], c["totale"]) for g in elenco for c in g["categorie"]]
    piu_alta = max(tutte, key=lambda x: x[1], default=None)
    return {"da": inizio.isoformat(), "a": fine.isoformat(),
            "totale": round(sum(g["totale"] for g in elenco), 2),
            "sottocategoria_con_la_spesa_piu_alta":
                {"categoria": piu_alta[0], "totale": piu_alta[1]} if piu_alta else None,
            "gruppi": elenco}


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
        "da": inizio.isoformat(), "a": fine.isoformat(), **_filtri(categoria, testo),
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
    return {**_filtri(categoria, None),
            "mesi": [{"mese": m, "totale": round(t, 2)} for m, t in sorted(mesi.items())]}


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
#i parametri facoltativi ammettono null: il modello a volte lo scrive invece di
#ometterli, e Groq rifiuterebbe la richiesta intera per un parametro fuori schema
_CATEGORIA = {"type": ["string", "null"], "description": "nome di un gruppo o di una sottocategoria, in italiano"}
_TESTO = {"type": ["string", "null"], "description": "parola cercata nella descrizione, es. un negozio"}


def _strumento(nome, descrizione, proprieta=None, obbligatori=()):
    return {"type": "function", "function": {
        "name": nome, "description": descrizione,
        "parameters": {"type": "object", "properties": proprieta or {}, "required": list(obbligatori)},
    }}


STRUMENTI = [
    _strumento("totale_spese", "Totale speso e numero di spese in un periodo, filtrabile.",
               {**_PERIODO, "categoria": _CATEGORIA, "testo": _TESTO}, ("da", "a")),
    _strumento("totali_per_periodi", "Totale di ciascun periodo, per confrontare periodi qualsiasi in una chiamata.",
               {"periodi": {"type": "array", "items": {"type": "object", "properties": _PERIODO,
                                                        "required": ["da", "a"]},
                            "description": f"da 2 a {MAX_PERIODI} periodi"},
                "categoria": _CATEGORIA, "testo": _TESTO}, ("periodi",)),
    _strumento("spese_per_categoria", "Totali del periodo divisi per gruppo e sottocategoria.",
               _PERIODO, ("da", "a")),
    _strumento("elenco_spese", "Le singole spese del periodo, le piu' alte o le piu' recenti.",
               {**_PERIODO, "categoria": _CATEGORIA, "testo": _TESTO,
                "ordine": {"type": ["string", "null"], "enum": ["importo", "data", None]},
                "limite": {"type": ["integer", "null"], "description": f"massimo {MAX_ELENCO}"}},
               ("da", "a")),
    _strumento("totali_mensili", "Totale di ogni mese del periodo, per andamenti e confronti.",
               {**_PERIODO, "categoria": _CATEGORIA}, ("da", "a")),
    _strumento("stato_budget", "Budget del ciclo in corso: speso, rimanente, giorni alla fine."),
    _strumento("abbonamenti_attivi", "Abbonamenti attivi con costo e prossimo addebito."),
]

_DESCRIZIONI = {s["function"]["name"]: s["function"]["description"] for s in STRUMENTI}

_FUNZIONI = {
    "totale_spese": totale_spese,
    "totali_per_periodi": totali_per_periodi,
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
    #l'utente e il giorno li mettiamo noi: il modello non li sceglie. Un
    #parametro sconosciuto ("ordina" per "ordine") o null viene ignorato:
    #non c'e' un giro dopo per correggerlo, meglio il valore predefinito
    ammessi = set(inspect.signature(funzione).parameters) - {"db", "utente", "giorno"}
    parametri = {k: v for k, v in parametri.items() if k in ammessi and v is not None}
    try:
        return funzione(db, utente, giorno, **parametri)
    except ParametroNonValido as e:
        return {"errore": str(e)}
    except TypeError:
        return {"errore": "parametri sbagliati per questa funzione"}


# ---------------------------------------------------------------------------
# Il dialogo con il modello
# ---------------------------------------------------------------------------

def _contesto(utente: models.User, giorno: date) -> str:
    """Date e valuta, uguali nelle due richieste."""
    inizio, fine = get_budget_cycle(giorno, utente.budget_start_day or 1)
    #date gia' calcolate: da solo il modello a volte mette un anno sbagliato
    #("meta' settembre" -> 2023)
    inizio_mese = giorno.replace(day=1)
    fine_mese = (inizio_mese + timedelta(days=32)).replace(day=1) - timedelta(days=1)
    fine_mese_scorso = inizio_mese - timedelta(days=1)
    inizio_mese_scorso = fine_mese_scorso.replace(day=1)
    return (
        f"Oggi e' {giorno.isoformat()} ({categorization.WEEKDAYS_IT[giorno.weekday()]}), "
        f"l'anno in corso e' il {giorno.year}. "
        f"Questo mese va dal {inizio_mese.isoformat()} al {fine_mese.isoformat()}, "
        f"il mese scorso dal {inizio_mese_scorso.isoformat()} al {fine_mese_scorso.isoformat()}. "
        "Un mese nominato senza anno e' di quest'anno, o dell'anno scorso se sarebbe nel futuro. "
        f"Il ciclo di budget in corso va dal {inizio.isoformat()} al {fine.isoformat()}. "
        f"Gli importi sono in {utente.currency}. "
    )


#la lingua dell'app (users.language): chiedendo al modello di riconoscerla dal
#messaggio, rispondeva a volte in inglese a domande in italiano e viceversa
_LINGUE = {"it": "in italiano", "en": "in English"}


def _regole_risposta(utente: models.User) -> str:
    return (
        f"Rispondi sempre {_LINGUE.get(utente.language, 'in italiano')}, "
        "in al massimo quattro frasi di testo semplice: niente markdown, elenchi puntati, "
        "tabelle o JSON. Importi con due decimali, scritti come si usa nella lingua della "
        "risposta (in italiano 354,00 €), con il simbolo della valuta invece del codice. "
        "Se i dati sono filtrati per categoria o per testo, nominali nella risposta, "
        "cosi' l'utente vede di cosa e' il totale. Quando citi una singola "
        "spesa, di' anche cos'era e quando. Se i dati contengono molte spese singole, "
        "non elencarle tutte: di' quante sono, il totale e al massimo le tre piu' "
        "importanti. Non calcolare percentuali. "
    )


def _istruzioni_scelta(db: Session, utente: models.User, giorno: date) -> str:
    """Prima richiesta: il modello sceglie le funzioni, o risponde subito a un saluto."""
    #tutte le sottocategorie, raggruppate: con un solo giro il modello non puo'
    #sbagliare un nome e riprovare, quello giusto deve averlo subito. Sono
    #~250 token in piu', meno di una richiesta in piu' per correggersi
    per_gruppo: dict[str, list[str]] = defaultdict(list)
    for c in db.query(models.Category).filter(models.Category.parent_id.isnot(None)):
        per_gruppo[c.parent.name].append(c.name)
    categorie = "; ".join(f"{g}: {', '.join(sorted(n))}" for g, n in sorted(per_gruppo.items()))
    return (
        "Sei l'assistente di TrackIt, un'app per tenere traccia delle spese personali. "
        "Per rispondere alle domande dell'utente sulle sue spese, chiama le funzioni disponibili. "
        "Hai un solo turno per chiamarle: chiedi subito, tutte insieme, le funzioni che "
        "servono, perche' dopo aver ricevuto i risultati dovrai rispondere senza poterne "
        "chiedere altre. Scegli quelle che bastano a rispondere: totali_mensili per "
        "confrontare mesi, totali_per_periodi per confrontare periodi che non sono mesi "
        "interi, spese_per_categoria per sapere in cosa si spende di piu', elenco_spese "
        "per le singole spese. "
        + _contesto(utente, giorno)
        + f"Categorie, per gruppo: {categorie}. Come categoria passa solo il nome, "
        "senza il gruppo davanti, oppure il nome di un gruppo. "
        + _regole_risposta(utente)
        + "Se il messaggio non riguarda le spese dell'utente, non chiamare funzioni e "
        "rispondi in una frase che puoi registrare una spesa (per esempio \"Pizza 15 "
        "euro\") o rispondere a domande sulle spese (per esempio \"Quanto ho speso "
        "questo mese?\")."
    )


#precede i dati nella seconda richiesta
INIZIO_DATI = "Dati:\n"


def _in_righe(valore, rientro: str = "") -> str:
    """I risultati come testo indentato, una riga per valore.

    Ricevendoli in JSON il modello a volte rispondeva in JSON anche lui,
    e l'utente avrebbe letto le parentesi graffe in chat.
    """
    if isinstance(valore, dict):
        righe = []
        for chiave, v in valore.items():
            if isinstance(v, (dict, list)) and v:
                righe.append(f"{rientro}{chiave}:\n{_in_righe(v, rientro + '  ')}")
            else:
                righe.append(f"{rientro}{chiave}: {_in_righe(v)}")
        return "\n".join(righe)
    if isinstance(valore, list):
        if not valore:
            return "nessuno"
        return "\n".join(f"{rientro}-\n{_in_righe(v, rientro + '  ')}" if isinstance(v, dict)
                         else f"{rientro}- {v}" for v in valore)
    return "nessuno" if valore is None else str(valore)


def _istruzioni_risposta(utente: models.User, giorno: date, risultati: list) -> str:
    """Seconda richiesta: i dati e il compito di rispondere, senza parlare di funzioni.

    Se queste istruzioni nominano le funzioni, o la conversazione contiene le
    chiamate della prima richiesta, il modello prova a chiamarne un'altra
    anche senza averne a disposizione, e Groq rifiuta la richiesta intera.
    """
    return (
        "Sei l'assistente di TrackIt, un'app per tenere traccia delle spese personali. "
        "Rispondi alla domanda dell'utente usando solo i dati qui sotto, calcolati dal "
        "server sulle sue spese. Non inventare mai cifre e non rifare somme che "
        "trovi gia' fatte. Non nominare spese, negozi, date o categorie che non compaiono "
        "nei dati: se non bastano a rispondere, dillo. "
        + _contesto(utente, giorno)
        + _regole_risposta(utente)
        + "\n\n" + INIZIO_DATI + _in_righe(risultati)
    )


class RispostaTroncata(Exception):
    """Il budget di max_tokens e' finito prima della fine della risposta."""


def _chiama_modello(messaggi: list, con_strumenti: bool):
    strumenti = {"tools": STRUMENTI, "tool_choice": "auto"} if con_strumenti else {}
    scelta = categorization.groq_client.chat.completions.create(
        model=MODELLO,
        messages=messaggi,
        #non c'e' un secondo tentativo, ne' per scegliere le funzioni ne' per
        #rispondere: con "low" il modello chiedeva spesso solo meta' dei dati
        #(agosto ma non settembre in un confronto) e leggeva male i risultati
        #(la categoria piu' piccola indicata come la piu' grande)
        reasoning_effort="medium",
        #il ragionamento rientra nel budget: con 1024 un elenco di spese finiva
        #tagliato a meta' parola ("il 4 settembre hai acquist")
        max_tokens=4096,
        **strumenti,
    ).choices[0]
    if scelta.finish_reason == "length":
        #meglio "non sono riuscito a rispondere" che una frase spezzata in chat
        raise RispostaTroncata()
    return scelta.message


def _testo_semplice(messaggio) -> str | None:
    #la chat mostra testo semplice: un grassetto resterebbe "**così**"
    testo = (messaggio.content or "").replace("**", "").strip()
    if testo.startswith(("{", "[")):
        #ha risposto con i dati grezzi invece che a parole: meglio "non sono
        #riuscito a rispondere" che parentesi graffe in chat
        logger.warning("risposta del modello in JSON invece che a parole")
        return None
    return testo or None


def _scambio_precedente(precedente: dict | None) -> list:
    """L'ultima domanda e la sua risposta, per capire "quali sono?" o "e il mese scorso?".

    Solo testo, senza le chiamate a funzione: vedendole il modello prova a
    richiamarle anche nella seconda richiesta, dove non ne ha.
    """
    if not precedente:
        return []
    return [{"role": "user", "content": precedente["domanda"]},
            {"role": "assistant", "content": precedente["risposta"]}]


def rispondi_a_domanda(
    testo: str, db: Session, utente: models.User, giorno: date, quota: Callable[[], None],
    precedente: dict | None = None,
) -> str | None:
    """La risposta da mostrare in chat, o None se il modello non ne ha data una.

    Al massimo due richieste a Groq: nella prima il modello sceglie le
    funzioni, nella seconda riceve i risultati e risponde. quota() viene
    chiamata prima di ognuna e solleva ServizioOccupato quando il tetto
    globale e' raggiunto. precedente ({"domanda", "risposta"}) e' l'ultimo
    scambio della chat, mandato a entrambe le richieste.
    """
    domanda = [*_scambio_precedente(precedente), {"role": "user", "content": testo}]
    try:
        quota()
        scelta = _chiama_modello(
            [{"role": "system", "content": _istruzioni_scelta(db, utente, giorno)}, *domanda],
            con_strumenti=True,
        )
        chiamate = (scelta.tool_calls or [])[:MAX_FUNZIONI]
        if not chiamate:
            #ha risposto subito: un saluto, o una domanda che non riguarda le spese
            return _testo_semplice(scelta)

        #ogni dato e' descritto a parole e non con il nome della funzione:
        #vedendo il nome, il modello prova a richiamarla
        risultati = [
            {"cosa": _DESCRIZIONI.get(c.function.name, ""),
             "risultato": esegui_strumento(c.function.name, c.function.arguments, db, utente, giorno)}
            for c in chiamate
        ]
        quota()
        return _testo_semplice(_chiama_modello(
            [{"role": "system", "content": _istruzioni_risposta(utente, giorno, risultati)}, *domanda],
            con_strumenti=False,
        ))
    except RateLimitError:
        logger.warning("limite di frequenza di Groq raggiunto")
        raise categorization.ServizioOccupato()
    except categorization.ServizioOccupato:
        raise
    except RispostaTroncata:
        logger.warning("risposta del modello troncata da max_tokens")
        return None
    except Exception:
        logger.exception("risposta alla domanda non riuscita")
        return None

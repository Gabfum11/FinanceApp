"""I conti sulle spese dell'utente che l'assistente puo' chiedere.

Ogni funzione filtra sempre per l'utente e restituisce numeri gia' calcolati
dal database: il modello li riceve e li racconta, non li somma lui.
STRUMENTI descrive le funzioni al modello, esegui_strumento esegue la sua scelta.
"""
import inspect
import json
import re
from collections import defaultdict
from datetime import date, timedelta

from dateutil.relativedelta import relativedelta
from sqlalchemy.orm import Session, aliased

from app import models
from app.business_logic.budget import get_budget_cycle, safe_day

#un periodo piu' lungo non serve a nessuna domanda sensata e allungherebbe le query
MAX_GIORNI_PERIODO = 3660
MAX_ELENCO = 15
#la fonte le manda tutte, l'app le apre a blocchi: il tetto vale per periodi lunghissimi
MAX_FONTE = 500

# ---------------------------------------------------------------------------
# Le funzioni che il modello puo' chiamare
# ---------------------------------------------------------------------------

class ParametroNonValido(Exception):
    """Torna al modello come {"errore": ...}: nella risposta dice cosa non ha trovato."""


def _data(valore) -> date:
    """AAAA-MM-GG. Un giorno oltre la fine del mese ("2026-09-31") vale l'ultimo:
    rifiutandolo, il mese spariva dalla risposta ("non ho il totale di settembre")."""
    trovata = re.fullmatch(r"(\d{4})-(\d{2})-(\d{2})", str(valore))
    try:
        anno, mese, giorno = map(int, trovata.groups())
        return date(anno, mese, safe_day(anno, mese, giorno))
    except (AttributeError, ValueError):
        raise ParametroNonValido("date nel formato AAAA-MM-GG, per esempio 2026-09-01")


def _intero(valore, nome) -> int:
    try:
        return int(valore)
    except (TypeError, ValueError):
        raise ParametroNonValido(f"'{nome}' e' un numero intero")


_UNITA = ("giorno", "settimana", "weekend", "mese", "trimestre", "anno")


def _intervallo(p, giorno: date) -> tuple[date, date]:
    """Primo e ultimo giorno di un periodo descritto dal modello.

    Le date le calcola il server: da solo il modello sbagliava i conti
    ("il weekend scorso" di mercoledi' 28 diventava 21-22, cioe' mer-gio).
    """
    if not isinstance(p, dict):
        raise ParametroNonValido("il periodo e' un oggetto, per esempio {\"mese\": \"2026-09\"}")
    unita = p.get("unita")
    if p.get("mese"):
        inizio = _data(f"{p['mese']}-01")
        fine = inizio + relativedelta(months=1, days=-1)
    elif p.get("anno"):
        anno = _intero(p["anno"], "anno")
        inizio, fine = _data(f"{anno:04d}-01-01"), date(anno, 12, 31)
    elif p.get("ultimi") is not None:
        n = _intero(p["ultimi"], "ultimi")
        indietro = {"giorno": relativedelta(days=n), "settimana": relativedelta(weeks=n),
                    "mese": relativedelta(months=n), "trimestre": relativedelta(months=3 * n),
                    "anno": relativedelta(years=n)}.get(unita)
        if n < 1 or indietro is None:
            raise ParametroNonValido("'ultimi' vuole un numero da 1 in su e unita giorno, settimana, mese, trimestre o anno")
        inizio, fine = giorno - indietro + timedelta(days=1), giorno
    elif unita is not None:
        n = _intero(p.get("indietro") or 0, "indietro")
        lunedi = giorno - timedelta(days=giorno.weekday(), weeks=n)
        primo_trimestre = date(giorno.year, 3 * ((giorno.month - 1) // 3) + 1, 1) - relativedelta(months=3 * n)
        primo_mese = giorno.replace(day=1) - relativedelta(months=n)
        intervalli = {
            "giorno": (giorno - timedelta(days=n),) * 2,
            "settimana": (lunedi, lunedi + timedelta(days=6)),
            #il weekend della settimana: di mercoledi', 0 e' quello che arriva, 1 lo scorso
            "weekend": (lunedi + timedelta(days=5), lunedi + timedelta(days=6)),
            "mese": (primo_mese, primo_mese + relativedelta(months=1, days=-1)),
            "trimestre": (primo_trimestre, primo_trimestre + relativedelta(months=3, days=-1)),
            "anno": (date(giorno.year - n, 1, 1), date(giorno.year - n, 12, 31)),
        }
        if unita not in intervalli:
            raise ParametroNonValido("unita sconosciuta, usa una di queste: " + ", ".join(_UNITA))
        inizio, fine = intervalli[unita]
    else:
        inizio, fine = _data(p.get("da")), _data(p.get("a"))
    if fine < inizio:
        raise ParametroNonValido("'a' viene prima di 'da'")
    if (fine - inizio).days > MAX_GIORNI_PERIODO:
        raise ParametroNonValido("periodo troppo lungo: al massimo 10 anni")
    return inizio, fine


def _periodo(da, a, giorno: date, periodo=None) -> tuple[date, date]:
    #il modello manda "periodo"; da e a restano per chi chiama le funzioni direttamente
    return _intervallo({"da": da, "a": a} if periodo is None else periodo, giorno)


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
                 models.Category.name, padre.name, models.Expense.id)
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
    righe = query.all()
    if testo:
        #la descrizione e' cifrata nel database: si cerca dopo averla letta
        #piu' parole: "calcio" da sola non trova "calcetto", i sinonimi li sceglie il modello
        #a inizio parola: "eni" dentro "Freni" o "Trenitalia" gonfiava il totale.
        #Prima puo' esserci una cifra, cosi' "%" trova ancora "50%"
        cerca = [re.compile(r"(?<![^\W\d_])" + re.escape(str(p).casefold()))
                 for p in (testo if isinstance(testo, list) else [testo]) if p]
        righe = [r for r in righe if any(c.search(r.description.casefold()) for c in cerca)]
    return righe


def _filtri(categoria, testo) -> dict:
    """I filtri usati, ripetuti nel risultato.

    Senza, il modello riceve "totale: 77.5" e non sa che e' solo dei
    ristoranti: rispondeva di non avere il dato per categoria.
    """
    return {"categoria": categoria or "tutte", **({"testo_cercato": testo} if testo else {})}


def totale_spese(db, utente, giorno, da=None, a=None, categoria=None, testo=None, periodo=None):
    inizio, fine = _periodo(da, a, giorno, periodo)
    righe = _righe(db, utente, inizio, fine, categoria, testo)
    return {
        "da": inizio.isoformat(), "a": fine.isoformat(), **_filtri(categoria, testo),
        "totale": round(sum(r.amount for r in righe), 2),
        "numero_spese": len(righe),
    }


#un anno di mesi o di settimane; i confronti fra mesi vanno a totali_mensili, senza tetto
MAX_PERIODI = 12


def totali_per_periodi(db, utente, giorno, periodi, categoria=None, testo=None):
    """Piu' periodi in una sola funzione: il modello chiede raramente due funzioni insieme."""
    if not isinstance(periodi, list) or not periodi:
        raise ParametroNonValido("'periodi' e' un elenco di periodi, per esempio [{\"mese\": \"2026-08\"}, {\"mese\": \"2026-09\"}]")
    risultati = []
    for p in periodi[:MAX_PERIODI]:
        #_intervallo rifiuta da solo un periodo che non e' un oggetto
        risultati.append(totale_spese(db, utente, giorno, categoria=categoria, testo=testo, periodo=p))
    #detto nel risultato: senza, il modello rispondeva come se li avesse tutti
    esclusi = len(periodi) - len(risultati)
    return {"periodi": risultati, **({"periodi_chiesti_ma_esclusi": esclusi} if esclusi else {})}


def spese_per_categoria(db, utente, giorno, da=None, a=None, periodo=None):
    inizio, fine = _periodo(da, a, giorno, periodo)
    gruppi: dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))
    for r in _righe(db, utente, inizio, fine):
        sotto = r[3] or "Senza categoria"
        gruppi[r[4] or sotto][sotto] += r.amount
    elenco = []
    for g, s in gruppi.items():
        ordinate = sorted(s.items(), key=lambda x: -x[1])
        gruppo = {"gruppo": g, "totale": round(sum(s.values()), 2),
                  #le prime cinque bastano a spiegare un gruppo e tengono corta la risposta
                  "categorie": [{"categoria": n, "totale": round(t, 2)} for n, t in ordinate[:5]]}
        #il resto a parte: sommando solo le cinque, il modello non ritroverebbe il totale
        if len(ordinate) > 5:
            gruppo["altre_sottocategorie"] = {"numero": len(ordinate) - 5,
                                              "totale": round(sum(t for _, t in ordinate[5:]), 2)}
        elenco.append(gruppo)
    elenco.sort(key=lambda x: -x["totale"])
    #detta esplicitamente: confrontando da solo le cifre, il modello indicava a
    #volte come piu' alta una categoria piu' piccola (77,50 contro 80,00)
    tutte = [(c["categoria"], c["totale"]) for g in elenco for c in g["categorie"]]
    piu_alta = max(tutte, key=lambda x: x[1], default=None)
    return {"da": inizio.isoformat(), "a": fine.isoformat(),
            "totale": round(sum(g["totale"] for g in elenco), 2),
            "sottocategoria_con_la_spesa_piu_alta":
                {"categoria": piu_alta[0], "totale": piu_alta[1]} if piu_alta else None,
            "gruppi": elenco}


def elenco_spese(db, utente, giorno, da=None, a=None, categoria=None, testo=None, ordine="importo", limite=10,
                 periodo=None):
    inizio, fine = _periodo(da, a, giorno, periodo)
    righe = _righe(db, utente, inizio, fine, categoria, testo)
    if ordine == "data":
        righe.sort(key=lambda r: r.date, reverse=True)
    else:
        #senza il crescente, "la spesa piu' piccola" riceveva la piu' alta
        righe.sort(key=lambda r: r.amount, reverse=ordine != "importo_crescente")
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


def totali_mensili(db, utente, giorno, da=None, a=None, categoria=None, testo=None, periodo=None):
    inizio, fine = _periodo(da, a, giorno, periodo)
    totali: dict[str, float] = defaultdict(float)
    for r in _righe(db, utente, inizio, fine, categoria, testo):
        totali[r.date.strftime("%Y-%m")] += r.amount
    #anche i mesi senza spese: "a luglio zero" e' un'informazione, non un buco
    mesi = []
    cursore = inizio.replace(day=1)
    while cursore <= fine:
        prossimo = (cursore + timedelta(days=32)).replace(day=1)
        mese = {"mese": cursore.strftime("%Y-%m")}
        #un mese tagliato dal periodo lo dice: senza, "2026-09" con quattro
        #giorni diventava "a settembre hai speso solo 48 euro"
        if cursore < inizio:
            mese["dal"] = inizio.isoformat()
        if prossimo - timedelta(days=1) > fine:
            mese["al"] = fine.isoformat()
        mese["totale"] = round(totali[mese["mese"]], 2)
        mesi.append(mese)
        cursore = prossimo
    return {"da": inizio.isoformat(), "a": fine.isoformat(), **_filtri(categoria, testo), "mesi": mesi}


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


#budget e abbonamenti non contano spese: la loro risposta non ha un elenco da mostrare
_LEGGONO_SPESE = {"totale_spese", "totali_per_periodi", "spese_per_categoria", "elenco_spese", "totali_mensili"}


def fonte(chiamate: list[tuple[str, str]], db: Session, utente: models.User, giorno: date) -> dict | None:
    """Le spese da cui vengono i numeri della risposta, per la riga sotto il messaggio.

    Si rileggono con gli stessi parametri delle funzioni scelte, senza passare
    dal modello: l'elenco che vede l'utente e' quello che ha prodotto i totali.
    """
    righe, periodi, filtri = {}, [], []
    for nome, argomenti in chiamate:
        if nome not in _LEGGONO_SPESE:
            continue
        try:
            p = json.loads(argomenti or "{}")
        except ValueError:
            continue
        if not isinstance(p, dict):
            continue
        #spese_per_categoria non filtra: con un filtro inventato l'elenco direbbe il falso
        categoria, testo = (None, None) if nome == "spese_per_categoria" else (p.get("categoria"), p.get("testo"))
        intervalli = p.get("periodi") if nome == "totali_per_periodi" else [p.get("periodo") or p]
        for i in (intervalli[:MAX_PERIODI] if isinstance(intervalli, list) else []):
            try:
                inizio, fine = _intervallo(i, giorno)
                trovate = _righe(db, utente, inizio, fine, categoria, testo)
            except ParametroNonValido:
                continue #la funzione ha gia' risposto con un errore: niente da mostrare
            periodi.append((inizio, fine))
            filtri.append(_filtri(categoria, testo))
            #due funzioni sullo stesso periodo trovano le stesse spese: contano una volta
            righe.update({r.id: r for r in trovate})
    if not periodi:
        return None
    spese = sorted(righe.values(), key=lambda r: -r.amount)
    return {
        "numero_spese": len(spese),
        "da": min(i for i, _ in periodi).isoformat(), "a": max(f for _, f in periodi).isoformat(),
        #filtri diversi fra le chiamate non si riassumono in una riga: non si mostrano
        **(filtri[0] if all(f == filtri[0] for f in filtri) else {}),
        "spese": [{"data": r.date.isoformat(), "descrizione": r.description, "importo": round(r.amount, 2)}
                  for r in spese[:MAX_FONTE]],
    }


#un periodo si descrive, non si calcola: le date le ricava _intervallo
_CAMPI_PERIODO = {
    "mese": {"type": ["string", "null"], "description": "un mese intero, AAAA-MM (\"settembre\" -> \"2026-09\")"},
    "anno": {"type": ["integer", "null"], "description": "un anno intero"},
    "unita": {"type": ["string", "null"], "enum": [*_UNITA, None],
              "description": "con indietro o con ultimi; settimana e weekend partono dal lunedi'"},
    "indietro": {"type": ["integer", "null"],
                 "description": "con unita: 0 quello in corso, 1 il precedente (\"il weekend scorso\", "
                                "\"il mese scorso\"), 3 per \"tre settimane fa\""},
    "ultimi": {"type": ["integer", "null"],
               "description": "con unita: gli ultimi N fino a oggi compreso (\"ultimi 3 mesi\", \"ultimi 10 giorni\")"},
    "da": {"type": ["string", "null"], "description": "AAAA-MM-GG, solo con a e solo per giorni precisi detti "
                                                       "dall'utente (\"dal 3 al 10 settembre\")"},
    "a": {"type": ["string", "null"], "description": "AAAA-MM-GG, ultimo giorno incluso"},
}
_PERIODO = {"periodo": {"type": "object", "properties": _CAMPI_PERIODO,
                        "description": "uno solo fra: mese, anno, unita con indietro, unita con ultimi, da con a. "
                                       "Non calcolare date"}}
#i parametri facoltativi ammettono null: il modello a volte lo scrive invece di
#ometterli, e Groq rifiuterebbe la richiesta intera per un parametro fuori schema
_CATEGORIA = {"type": ["string", "null"], "description": "nome di un gruppo o di una sottocategoria, in italiano"}
_TESTO = {"type": ["array", "null"], "items": {"type": "string"},
          "description": "parole cercate nella descrizione (basta una): un negozio, un prodotto, "
                         "un'attivita'. Metti sempre anche sinonimi, diminutivi, abbreviazioni, "
                         "marchi e varianti nella lingua della domanda, perche' l'utente le scrive "
                         "a modo suo (es. [\"benzina\", \"carburante\", \"rifornimento\", \"diesel\", "
                         "\"eni\", \"q8\"])"}


def _strumento(nome, descrizione, proprieta=None, obbligatori=()):
    return {"type": "function", "function": {
        "name": nome, "description": descrizione,
        "parameters": {"type": "object", "properties": proprieta or {}, "required": list(obbligatori)},
    }}


STRUMENTI = [
    _strumento("totale_spese", "Totale speso e numero di spese in un periodo, filtrabile.",
               {**_PERIODO, "categoria": _CATEGORIA, "testo": _TESTO}, ("periodo",)),
    _strumento("totali_per_periodi", "Totale di ciascun periodo, per confrontare periodi qualsiasi in una chiamata.",
               {"periodi": {"type": "array", "items": {"type": "object", "properties": _CAMPI_PERIODO},
                            "description": f"da 2 a {MAX_PERIODI} periodi"},
                "categoria": _CATEGORIA, "testo": _TESTO}, ("periodi",)),
    _strumento("spese_per_categoria", "Totali del periodo divisi per gruppo e sottocategoria.",
               _PERIODO, ("periodo",)),
    _strumento("elenco_spese", "Le singole spese del periodo, le piu' alte o le piu' recenti.",
               {**_PERIODO, "categoria": _CATEGORIA, "testo": _TESTO,
                "ordine": {"type": ["string", "null"], "enum": ["importo", "importo_crescente", "data", None],
                           "description": "importo: dalla piu' alta; importo_crescente: dalla piu' piccola; "
                                          "data: dalla piu' recente"},
                "limite": {"type": ["integer", "null"], "description": f"massimo {MAX_ELENCO}"}},
               ("periodo",)),
    _strumento("totali_mensili", "Totale di ogni mese del periodo, per andamenti e confronti.",
               {**_PERIODO, "categoria": _CATEGORIA, "testo": _TESTO}, ("periodo",)),
    _strumento("stato_budget", "Budget del ciclo in corso: speso, rimanente, giorni alla fine."),
    _strumento("abbonamenti_attivi", "Abbonamenti attivi con costo e prossimo addebito."),
]

DESCRIZIONI = {s["function"]["name"]: s["function"]["description"] for s in STRUMENTI}

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


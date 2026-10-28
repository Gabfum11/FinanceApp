"""Risposte alle domande sulle proprie spese ("quanto ho speso in ristoranti a settembre?").

Il modello non legge mai le spese: sceglie una delle funzioni di conti_spese con i
suoi parametri, i conti li fa il database filtrando sempre per l'utente, e il
modello scrive la risposta con i numeri ricevuti. Cosi' i totali sono esatti
(un modello che somma decine di cifre sbaglia) e nessuna domanda puo' arrivare
ai dati di un altro account.
"""
import re
from collections import defaultdict
from datetime import date, timedelta
from typing import Callable

from groq import RateLimitError
from sqlalchemy.orm import Session

from app import models
from app.business_logic import categorization
from app.business_logic.conti_spese import DESCRIZIONI, STRUMENTI, esegui_strumento, fonte
from app.business_logic.budget import get_budget_cycle
from app.logging_config import get_logger

logger = get_logger(__name__)

#il 20b, usato per l'estrazione delle spese, qui sbagliava piu' spesso la
#scelta delle funzioni e scriveva un italiano poco naturale ("nel settembre")
MODELLO = "openai/gpt-oss-120b"
#funzioni eseguite per una domanda: il modello le chiede tutte insieme nella
#prima richiesta a Groq, perche' nella seconda deve rispondere
MAX_FUNZIONI = 4

# ---------------------------------------------------------------------------
# Spesa o domanda?
# ---------------------------------------------------------------------------

#prime parole tipiche di una domanda o di una richiesta. "ho speso" manca di
#proposito: apre sia "ho speso 20 euro al bar" sia "ho speso troppo?"
_PAROLE_DOMANDA = {
    "quanto", "quanta", "quanti", "quante", "qual", "quale", "quali", "quando",
    "dove", "come", "perche", "perché", "perchè", "cosa", "che", "chi",
    "mostrami", "dimmi", "elenca", "confronta", "riassumi", "riepilogo",
    #"quant'è" arriva qui come "quant", tagliato all'apostrofo
    "quant", "dammi", "fammi", "elencami", "vorrei",
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
    if not re.search(r"\d", pulito): #è vero se non c'è nessuna cifra
        return True
    parole = re.findall(r"[a-zàèéìòù']+", pulito) 
    return bool(parole) and parole[0].strip("'").split("'")[0] in _PAROLE_DOMANDA


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
        "tabelle o JSON. Se la domanda chiede di confrontare piu' di tre periodi o categorie, "
        "puoi usare fino a sei frasi, per nominarli tutti. Importi con due decimali, scritti come si usa nella lingua della "
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
        "per le singole spese. Se la domanda riguarda una cosa precisa (un'attivita', "
        "un prodotto, un negozio) e non una categoria intera, filtra con testo e "
        "passa tutte le parole con cui l'utente potrebbe averla scritta. "
        "Per i periodi non calcolare mai date: descrivili con mese, anno, unita con "
        "indietro o unita con ultimi, e le date le ricava il server. Usa da e a solo "
        "per giorni precisi detti dall'utente. "
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


def _con_fonte(testo: str | None, fonte_spese: dict | None) -> dict | None:
    return {"testo": testo, "fonte": fonte_spese} if testo else None


def rispondi_a_domanda(
    testo: str, db: Session, utente: models.User, giorno: date, quota: Callable[[], None],
    precedente: dict | None = None,
) -> dict | None:
    """La risposta da mostrare in chat, o None se il modello non ne ha data una.

    {"testo": ..., "fonte": ...}: la fonte (conti_spese.fonte) sono le spese
    lette per rispondere, None se la risposta non ne ha usate.

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
            return _con_fonte(_testo_semplice(scelta), None)

        #ogni dato e' descritto a parole e non con il nome della funzione:
        #vedendo il nome, il modello prova a richiamarla
        risultati = [
            {"cosa": DESCRIZIONI.get(c.function.name, ""),
             "risultato": esegui_strumento(c.function.name, c.function.arguments, db, utente, giorno)}
            for c in chiamate
        ]
        #temporanea, per il debug in produzione: scrive le parole cercate dagli utenti
        logger.debug("funzioni scelte: %s", [(c.function.name, c.function.arguments) for c in chiamate])
        quota()
        risposta = _testo_semplice(_chiama_modello(
            [{"role": "system", "content": _istruzioni_risposta(utente, giorno, risultati)}, *domanda],
            con_strumenti=False,
        ))
        return _con_fonte(risposta, fonte([(c.function.name, c.function.arguments) for c in chiamate], db, utente, giorno))
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

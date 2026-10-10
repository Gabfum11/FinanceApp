"""Nome e categoria delle righe importate.

In ordine: la memoria dei caricamenti precedenti, le descrizioni gia' usate a
mano, le parole chiave delle categorie, e solo per quello che resta l'AI.
All'AI arrivano nomi gia' puliti, senza date ne' importi: mai il testo della banca.
"""
import json
import re
from dataclasses import dataclass

from sqlalchemy.orm import Session

from app import models
from app.business_logic import categorization
from app.business_logic.import_pulizia import chiave_esercente, pulisci_nome
from app.logging_config import get_logger
from app.state import consuma_quota_groq

logger = get_logger(__name__)

MAX_NOMI_AI = 100
TEMPO_AI = 20

ISTRUZIONI = (
    "Ricevi un array JSON di nomi di negozi o servizi presi da un estratto conto. "
    'Per ognuno rispondi con "originale" (il nome ricevuto, identico), '
    '"nome" (lo stesso nome reso piu\' leggibile togliendo solo parole inutili come forme '
    "societarie, numeri di filiale o localita': non aggiungere mai parole che non ci sono) e "
    '"categoria" (una delle voci elencate sotto, scritta esattamente com\'e\', oppure null '
    "se non sei sicuro: meglio null che una categoria sbagliata). "
    'Rispondi solo con un JSON nella forma {"risultati": [{"originale": "...", "nome": "...", '
    '"categoria": "..."}]}. Categorie, raggruppate per ambito: '
)


@dataclass
class Proposta:
    nome: str
    categoria_id: int | None


def _parole(testo: str) -> set[str]:
    return set(re.findall(r"[a-zà-ù0-9]+", testo.lower()))


def nome_ammesso(proposto: str, originale: str) -> bool:
    """L'AI puo' solo togliere parole: ogni parola del nome proposto deve esserci gia'."""
    parole = _parole(proposto)
    return bool(parole) and parole <= _parole(originale)


def memoria_import(user_id: int, db: Session) -> dict[str, tuple[str, int]]:
    """Esercente gia' importato -> nome e categoria scelti l'ultima volta.

    Il testo della banca cambia ogni mese (data, ora, riferimenti): si confronta
    il nome pulito, che resta uguale.
    """
    righe = (
        db.query(models.Expense.descrizione_banca, models.Expense.description, models.Expense.category_id)
        .join(models.Category, models.Expense.category_id == models.Category.id)
        .filter(
            models.Expense.user_id == user_id,
            models.Expense.descrizione_banca.isnot(None),
            models.Category.parent_id.isnot(None),
        )
        .order_by(models.Expense.date.desc(), models.Expense.id.desc())
        .all()
    )
    memoria: dict[str, tuple[str, int]] = {}
    for testo, descrizione, category_id in righe:
        memoria.setdefault(chiave_esercente(pulisci_nome(testo)), (descrizione, category_id))
    return memoria


def _sottocategorie(db: Session) -> tuple[dict[str, int], dict[str, list[str]]]:
    sotto = db.query(models.Category).filter(models.Category.parent_id.isnot(None)).all()
    per_nome = {c.name: c.id for c in sotto}
    per_gruppo: dict[str, list[str]] = {}
    for c in sotto:
        per_gruppo.setdefault(c.parent.name, []).append(c.name)
    return per_nome, per_gruppo


def _da_regole(nome: str, regole: list[tuple[re.Pattern, int]]) -> int | None:
    for regola, category_id in regole:
        if regola.search(nome.lower()):
            return category_id
    return None


def _regole(db: Session) -> list[tuple[re.Pattern, int]]:
    """Le parole chiave delle sottocategorie, come parole intere.

    Il confronto dell'assistente cerca la parola dentro la frase: con i nomi dei
    negozi "gas" scatterebbe in "Gastronomia" e "bar" in "Barbiere", e la riga
    finirebbe tra le pronte con una categoria sbagliata.
    """
    regole = []
    sotto = db.query(models.Category).filter(
        models.Category.parent_id.isnot(None), models.Category.keywords.isnot(None)
    )
    for categoria in sotto:
        for parola in categoria.keywords.split(","):
            parola = parola.strip().lower()
            if parola:
                regole.append((re.compile(rf"(?<!\w){re.escape(parola)}(?!\w)"), categoria.id))
    return regole


def chiedi_ai(nomi: list[str], per_gruppo: dict[str, list[str]]) -> dict[str, dict]:
    """Nome e categoria proposti dall'AI, per nome inviato. {} se non risponde."""
    if not nomi or not consuma_quota_groq():
        return {}
    elenco = "; ".join(
        f"{gruppo}: " + ", ".join(f'"{n}"' for n in sorted(voci))
        for gruppo, voci in sorted(per_gruppo.items())
    )
    try:
        risposta = categorization.groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": ISTRUZIONI + elenco},
                {"role": "user", "content": json.dumps(nomi, ensure_ascii=False)},
            ],
            model="openai/gpt-oss-20b",
            reasoning_effort="low",
            max_tokens=4096,
            response_format={"type": "json_object"},
            timeout=TEMPO_AI,
        )
        dati = json.loads(risposta.choices[0].message.content)
    except Exception:
        #senza i nomi nel log: sono gli esercenti dell'utente
        logger.warning("categorie dell'import non disponibili", exc_info=True)
        return {}
    voci = dati.get("risultati") if isinstance(dati, dict) else None
    if not isinstance(voci, list):
        return {}
    return {v["originale"]: v for v in voci if isinstance(v, dict) and isinstance(v.get("originale"), str)}


def proponi(nomi: list[str], user_id: int, db: Session) -> dict[str, Proposta]:
    memoria = memoria_import(user_id, db)
    memoria_manuale = categorization.memoria_categorie(user_id, db)
    per_nome, per_gruppo = _sottocategorie(db)
    regole = _regole(db)

    proposte: dict[str, Proposta] = {}
    per_ai: list[str] = []
    for nome in dict.fromkeys(nomi):
        ricordato = memoria.get(chiave_esercente(nome))
        if ricordato:
            proposte[nome] = Proposta(ricordato[0], ricordato[1])
            continue
        categoria = categorization.cerca_in_memoria(nome, memoria_manuale) or _da_regole(nome, regole)
        proposte[nome] = Proposta(nome, categoria)
        if categoria is None:
            per_ai.append(nome)

    #oltre il tetto i nomi restano "da scegliere": meglio che una richiesta enorme
    per_ai = sorted(per_ai)[:MAX_NOMI_AI]
    risposte = chiedi_ai(per_ai, per_gruppo)
    for nome in per_ai:
        voce = risposte.get(nome, {})
        proposto = voce.get("nome")
        categoria = voce.get("categoria")
        proposte[nome] = Proposta(
            proposto.strip() if isinstance(proposto, str) and nome_ammesso(proposto, nome) else nome,
            per_nome.get(categoria) if isinstance(categoria, str) else None,
        )
    return proposte

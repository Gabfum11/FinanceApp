"""La spesa scritta in chat, pronta per la card di conferma dell'assistente."""
from datetime import date

from sqlalchemy.orm import Session

from app import models
from app.business_logic import categorization, import_categorie


def proponi_spesa(text: str, db: Session, current_user: models.User, giorno: date) -> dict | None:
    """La spesa letta nel testo, pronta per la card di conferma. None = non e' una spesa.

    Solleva categorization.ServizioOccupato se Groq e' saturo.
    """
    #solo le sottocategorie: una spesa non puo' essere assegnata a un gruppo.
    #Il gruppo viene comunque passato al modello come contesto, perche' aiuta
    #a scegliere ("Bolletta energia" sotto "Casa" e' piu' chiaro da solo)
    categories = (
        db.query(models.Category)
        .filter(models.Category.parent_id.isnot(None))
        .all() 
    )
    #le keywords accompagnano il nome: "Mezzi pubblici" da solo non fa pensare
    #a "treno", ma le sue parole chiave sì
    per_gruppo: dict[str, list[str]] = {}
    for c in categories:
        etichetta = c.name
        if c.keywords:
            prime = ", ".join(k.strip() for k in c.keywords.split(",")[:4] if k.strip()) #per non appesantire il prompt vengono prese solo 4 parole chiave
            if prime:
                etichetta = f"{c.name} ({prime})"
        per_gruppo.setdefault(c.parent.name, []).append(etichetta)

    #una descrizione gia' usata riprende la categoria dell'ultima volta: il modello
    #non deve sceglierla, e il prompt perde l'elenco delle categorie, la parte piu' lunga
    memoria = categorization.memoria_categorie(current_user.id, db)
    category_id = categorization.cerca_in_memoria(text, memoria)

    #passiamo i nomi al modello: categoria ed estrazione escono dalla stessa chiamata.
    #"ieri" e "lunedi" si contano dal giorno dell'utente, non da quello del server
    if category_id is None:
        extracted = categorization.extract_expense_from_text(text, [c.name for c in categories], per_gruppo, oggi=giorno)
    else:
        extracted = categorization.extract_expense_from_text(text, None, None, oggi=giorno)
    if extracted is None:
        return None

    if category_id is None: #il testo la scrive diversa ("caffe"), il modello come l'ultima volta ("Caffè")
        category_id = categorization.cerca_in_memoria(extracted["description"], memoria)
    if category_id is None and extracted["category"]:
        match = next((c for c in categories if c.name == extracted["category"]), None)
        category_id = match.id if match else None
    if category_id is None: #il modello non ha scelto: ci provano le keyword
        category_id = import_categorie.da_regole(extracted["description"], import_categorie.regole_parole_chiave(db))
    if category_id is None:
       altro=db.query(models.Category).filter(models.Category.name=="Altro").first()
       category_id=altro.id if altro else None

    category_name = None
    category_group = None
    if category_id is not None:
        category = db.query(models.Category).filter(models.Category.id == category_id).first() #serve per ottenere il nome della categoria
        category_name = category.name if category else None
        #il gruppo serve al client per scegliere l'icona: mandarlo qui evita
        #che debba caricare tutta la gerarchia solo per una riga
        if category and category.parent:
            category_group = category.parent.name
    return {
        "description": extracted["description"],
        "amount": extracted["amount"],
        # il modello la valorizza solo se il testo dice quando: altrimenti vale oggi
        "date": extracted["date"] or giorno,
        "category_id": category_id,
        "category_name": category_name,
        "category_group": category_group,
        "recurring": extracted["recurring"],
        "frequency" : extracted["frequency"],
        #solo se diversa da quella dell'utente: "15 euro" detto da chi conta in euro
        #e' una spesa normale
        "currency": None if extracted.get("currency") in (None, current_user.currency) else extracted["currency"],
    }

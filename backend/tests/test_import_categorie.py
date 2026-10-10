"""Nome e categoria delle righe importate: memoria, regole, AI simulata."""
import json
from datetime import date
from types import SimpleNamespace
from unittest.mock import patch

import pytest

from app import models
from app.business_logic import categorization, import_categorie
from app.business_logic.import_categorie import Proposta, nome_ammesso, proponi


@pytest.fixture
def db(db_session):
    s = db_session()
    yield s
    s.close()


@pytest.fixture
def categorie(db):
    cibo = models.Category(name="Cibo")
    sport = models.Category(name="Sport")
    db.add_all([cibo, sport])
    db.flush()
    bar = models.Category(name="Ristoranti e bar", parent_id=cibo.id)
    spesa = models.Category(name="Spesa alimentare", parent_id=cibo.id, keywords="conad,esselunga")
    palestra = models.Category(name="Palestra", parent_id=sport.id)
    db.add_all([bar, spesa, palestra])
    db.commit()
    return {"bar": bar.id, "spesa": spesa.id, "palestra": palestra.id}


@pytest.fixture
def utente(db, make_user):
    return make_user(email="io@example.com")


def risposta_ai(risultati):
    contenuto = json.dumps({"risultati": risultati})
    return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=contenuto))])


@pytest.mark.parametrize("proposto, originale, atteso", [
    ("Autogrill", "Autogrill Spa Villoresi Est", True),
    ("Tabaccheria", "Tabaccheria Di Bianchi M.", True),
    ("Palestra Gamma", "Gamma Srl", False),
    ("Pizzeria Spontini", "Sp 4521 Pizz", False),
    ("", "Gamma Srl", False),
])
def test_nome_ammesso(proposto, originale, atteso):
    assert nome_ammesso(proposto, originale) is atteso


def test_memoria_degli_import_vince_su_tutto(db, categorie, utente):
    db.add(models.Expense(user_id=utente, description="Palestra Gamma", amount=45, date=date(2026, 8, 3),
                          category_id=categorie["palestra"],
                          descrizione_banca="POS 4521 03/08/26 15:42 GAMMA SRL MILANO CARTA *1234"))
    db.commit()
    with patch.object(categorization.groq_client.chat.completions, "create") as ai:
        proposte = proponi(["Gamma Srl Milano"], utente, db)
    assert proposte == {"Gamma Srl Milano": Proposta("Palestra Gamma", categorie["palestra"])}
    ai.assert_not_called()


def test_regole_senza_ai(db, categorie, utente):
    with patch.object(categorization.groq_client.chat.completions, "create") as ai:
        proposte = proponi(["Conad Superstore"], utente, db)
    assert proposte["Conad Superstore"] == Proposta("Conad Superstore", categorie["spesa"])
    ai.assert_not_called()


def test_ai_per_i_nomi_rimasti_con_i_controlli(db, categorie, utente):
    risposta = risposta_ai([
        {"originale": "Autogrill Spa Villoresi Est", "nome": "Autogrill", "categoria": "Ristoranti e bar"},
        {"originale": "Gamma Srl", "nome": "Palestra Gamma", "categoria": "Palestra"},
        {"originale": "Ms Srl", "nome": "Ms Srl", "categoria": "Categoria inventata"},
    ])
    with patch.object(categorization.groq_client.chat.completions, "create", return_value=risposta):
        proposte = proponi(["Gamma Srl", "Autogrill Spa Villoresi Est", "Ms Srl"], utente, db)
    assert proposte["Autogrill Spa Villoresi Est"] == Proposta("Autogrill", categorie["bar"])
    #"Palestra" non c'era: il nome resta quello delle regole, la categoria si tiene
    assert proposte["Gamma Srl"] == Proposta("Gamma Srl", categorie["palestra"])
    assert proposte["Ms Srl"] == Proposta("Ms Srl", None)


def test_ai_che_non_risponde(db, categorie, utente):
    with patch.object(categorization.groq_client.chat.completions, "create", side_effect=TimeoutError):
        proposte = proponi(["Gamma Srl"], utente, db)
    assert proposte["Gamma Srl"] == Proposta("Gamma Srl", None)


def test_cosa_parte_verso_l_ai(db, categorie, utente):
    with patch.object(categorization.groq_client.chat.completions, "create",
                      return_value=risposta_ai([])) as ai:
        proponi(["Zeta Srl", "Gamma Srl", "Gamma Srl"], utente, db)
    argomenti = ai.call_args.kwargs
    inviati = json.loads(argomenti["messages"][1]["content"])
    #una volta sola, in ordine alfabetico
    assert inviati == ["Gamma Srl", "Zeta Srl"]
    assert argomenti["timeout"] == import_categorie.TEMPO_AI


def test_al_massimo_cento_nomi(db, categorie, utente):
    nomi = [f"Negozio {chr(65 + i // 26)}{chr(65 + i % 26)}" for i in range(120)]
    with patch.object(categorization.groq_client.chat.completions, "create",
                      return_value=risposta_ai([])) as ai:
        proposte = proponi(nomi, utente, db)
    assert len(json.loads(ai.call_args.kwargs["messages"][1]["content"])) == 100
    assert len(proposte) == 120
    assert all(p.categoria_id is None for p in proposte.values())

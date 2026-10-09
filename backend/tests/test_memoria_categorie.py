"""Memoria delle categorie: una descrizione gia' usata riprende la categoria dell'ultima volta.

Groq non viene mai chiamato: si verifica cosa riceve l'estrazione e quale
categoria esce dalla proposta.
"""
from datetime import date
from unittest.mock import patch

import pytest

from app import models
from app.business_logic import categorization
from app.routers.expenses import proponi_spesa

OGGI = date(2026, 10, 9)


def estrazione(descrizione, categoria=None):
    return {
        "description": descrizione, "amount": 7.55, "date": None,
        "category": categoria, "recurring": False, "frequency": None, "currency": None,
    }


@pytest.fixture
def db(db_session):
    s = db_session()
    yield s
    s.close()


@pytest.fixture
def categorie(db):
    cibo = models.Category(name="Cibo e bevande")
    cura = models.Category(name="Cura personale")
    db.add_all([cibo, cura])
    db.flush()
    alimentari = models.Category(name="Spesa alimentare", parent_id=cibo.id)
    bar = models.Category(name="Bar e caffè", parent_id=cibo.id, keywords="bar,caffè")
    parrucchiere = models.Category(name="Parrucchiere", parent_id=cura.id)
    db.add_all([alimentari, bar, parrucchiere])
    db.commit()
    return {"cibo": cibo.id, "alimentari": alimentari.id, "bar": bar.id, "parrucchiere": parrucchiere.id}


@pytest.fixture
def utente(db, make_user):
    return db.get(models.User, make_user(email="io@example.com"))


def spesa(db, utente_id, descrizione, categoria, giorno=date(2026, 10, 1)):
    db.add(models.Expense(user_id=utente_id, date=giorno, amount=5.0,
                          description=descrizione, category_id=categoria))
    db.commit()


def proponi(db, utente, testo, estratta):
    with patch("app.business_logic.categorization.extract_expense_from_text",
               return_value=estratta) as estrai:
        proposta = proponi_spesa(testo, db, utente, OGGI)
    return proposta, estrai


class TestMemoria:
    def test_descrizione_gia_vista_riprende_la_categoria(self, db, categorie, utente):
        spesa(db, utente.id, "Conad", categorie["alimentari"])
        proposta, _ = proponi(db, utente, "conad 7,55", estrazione("Conad"))
        assert proposta["category_id"] == categorie["alimentari"]

    def test_con_la_memoria_il_modello_non_riceve_le_categorie(self, db, categorie, utente):
        spesa(db, utente.id, "Conad", categorie["alimentari"])
        _, estrai = proponi(db, utente, "Conad 7,55 ieri", estrazione("Conad"))
        args, kwargs = estrai.call_args
        assert args[1] is None and args[2] is None

    def test_senza_memoria_il_modello_riceve_le_categorie(self, db, categorie, utente):
        _, estrai = proponi(db, utente, "Conad 7,55", estrazione("Conad", "Spesa alimentare"))
        args, _ = estrai.call_args
        assert "Spesa alimentare" in args[1]

    def test_la_memoria_prevale_sulla_scelta_del_modello(self, db, categorie, utente):
        """L'utente ha gia' deciso: il modello non deve contraddirlo."""
        spesa(db, utente.id, "Da Mario", categorie["bar"])
        proposta, _ = proponi(db, utente, "pranzo da mario 12", estrazione("Da Mario", "Spesa alimentare"))
        assert proposta["category_id"] == categorie["bar"]

    def test_vale_l_ultima_scelta(self, db, categorie, utente):
        spesa(db, utente.id, "Conad", categorie["bar"], giorno=date(2026, 9, 1))
        spesa(db, utente.id, "Conad", categorie["alimentari"], giorno=date(2026, 10, 1))
        proposta, _ = proponi(db, utente, "conad 7,55", estrazione("Conad"))
        assert proposta["category_id"] == categorie["alimentari"]

    def test_solo_parole_intere(self, db, categorie, utente):
        """"bar" dentro "barbiere" non e' il bar."""
        spesa(db, utente.id, "Bar", categorie["bar"])
        _, estrai = proponi(db, utente, "barbiere 15", estrazione("Barbiere", "Parrucchiere"))
        args, _ = estrai.call_args
        assert args[1] is not None

    def test_vince_la_descrizione_piu_lunga(self, db, categorie, utente):
        spesa(db, utente.id, "Bar", categorie["bar"])
        spesa(db, utente.id, "Bar Sport spesa", categorie["alimentari"])
        proposta, _ = proponi(db, utente, "bar sport spesa 20", estrazione("Bar Sport spesa"))
        assert proposta["category_id"] == categorie["alimentari"]

    def test_le_spese_degli_altri_non_contano(self, db, categorie, utente, make_user):
        altro = make_user(email="altro@example.com")
        spesa(db, altro, "Conad", categorie["bar"])
        proposta, _ = proponi(db, utente, "conad 7,55", estrazione("Conad", "Spesa alimentare"))
        assert proposta["category_id"] == categorie["alimentari"]

    def test_un_gruppo_non_e_una_memoria(self, db, categorie, utente):
        """Le vecchie spese possono puntare a un gruppo: una spesa nuova no."""
        spesa(db, utente.id, "Conad", categorie["cibo"])
        proposta, _ = proponi(db, utente, "conad 7,55", estrazione("Conad", "Spesa alimentare"))
        assert proposta["category_id"] == categorie["alimentari"]

    def test_la_descrizione_estratta_ritrova_la_memoria(self, db, categorie, utente):
        """Il testo non la contiene uguale, ma il modello la riscrive come l'ultima volta."""
        spesa(db, utente.id, "Caffè", categorie["bar"])
        proposta, _ = proponi(db, utente, "un caffe 1,20", estrazione("caffè", "Spesa alimentare"))
        assert proposta["category_id"] == categorie["bar"]


def test_cerca_in_memoria_ignora_maiuscole_e_spazi():
    memoria = categorization.ordina_memoria({"conad city": 1})
    assert categorization.cerca_in_memoria("Spesa al  CONAD   City 30", memoria) == 1

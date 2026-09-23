"""Limiti allineati a quelli di Groq, e messaggi che distinguono i due casi.

Il piano gratuito concede ~8000 token al minuto: con un prompt da ~940 token
sono circa 8 richieste. Un limite per utente più alto di quello globale
lascerebbe saturare Groq a un solo utente.
"""
from unittest.mock import patch

import pytest

from app import models
from app.business_logic import categorization

ESTRAZIONE_FINTA = {
    "description": "Pizza", "amount": 15.0, "date": None,
    "category": None, "recurring": False, "frequency": None,
}


@pytest.fixture
def utente_con_categoria(make_user, login_as, make_category):
    make_category(name="Altro")
    login_as(make_user(email="limiti@example.com"))


@pytest.fixture
def limiter_attivo():
    from app.main import app

    app.state.limiter.enabled = True
    app.state.limiter.reset()
    yield
    app.state.limiter.enabled = False


def chiedi(client, token="Bearer tok"):
    return client.post(
        "/expenses/extract-preview",
        json={"expenseText": "Pizza 15 euro"},
        headers={"Authorization": token},
    )


class TestLimitePerUtente:
    def test_oltre_cinque_al_minuto_viene_bloccato(self, client, utente_con_categoria, limiter_attivo):
        with patch("app.business_logic.categorization.extract_expense_from_text",
                   return_value=ESTRAZIONE_FINTA):
            codici = [chiedi(client).status_code for _ in range(8)]
        assert codici.count(200) == 5
        assert codici.count(429) == 3

    def test_groq_non_viene_chiamato_oltre_il_limite(self, client, utente_con_categoria, limiter_attivo):
        """È il punto: le richieste bloccate non devono consumare quota."""
        chiamate = 0

        def conta(*args, **kwargs):
            nonlocal chiamate
            chiamate += 1
            return ESTRAZIONE_FINTA

        with patch("app.business_logic.categorization.extract_expense_from_text", conta):
            for _ in range(8):
                chiedi(client)
        assert chiamate == 5


class TestLimiteGlobale:
    def test_utenti_diversi_condividono_il_tetto(self, client, make_user, login_as,
                                                 make_category, limiter_attivo):
        """Senza, due utenti attivi supererebbero insieme il limite di Groq."""
        make_category(name="Altro")
        codici = []
        with patch("app.business_logic.categorization.extract_expense_from_text",
                   return_value=ESTRAZIONE_FINTA):
            #tre utenti, 4 richieste ciascuno: sotto il limite individuale di 5,
            #ma insieme superano gli 8 globali
            for i in range(3):
                login_as(make_user(email=f"u{i}@example.com"))
                for _ in range(4):
                    codici.append(chiedi(client, token=f"Bearer tok{i}").status_code)

        assert codici.count(200) == 8, "il tetto globale ferma a 8"
        assert 429 in codici


class TestMessaggiDistinti:
    """Frase incomprensibile e servizio occupato richiedono risposte opposte."""

    def test_frase_incomprensibile_da_422(self, client, utente_con_categoria):
        with patch("app.business_logic.categorization.extract_expense_from_text",
                   return_value=None):
            r = chiedi(client)
        assert r.status_code == 422
        assert "capire" in r.json()["detail"]

    def test_groq_saturo_da_503(self, client, utente_con_categoria):
        with patch("app.business_logic.categorization.extract_expense_from_text",
                   side_effect=categorization.ServizioOccupato()):
            r = chiedi(client)
        assert r.status_code == 503, "non 422: la frase era valida"

    def test_il_messaggio_invita_a_riprovare(self, client, utente_con_categoria):
        with patch("app.business_logic.categorization.extract_expense_from_text",
                   side_effect=categorization.ServizioOccupato()):
            dettaglio = chiedi(client).json()["detail"]
        assert "Riprova" in dettaglio
        assert "capire" not in dettaglio, "dire 'non ho capito' porta a riscrivere invano"

    def test_nessuna_spesa_viene_creata(self, client, db_session, make_user, login_as, make_category):
        make_category(name="Altro")
        user_id = make_user(email="nessuna@example.com")
        login_as(user_id)
        with patch("app.business_logic.categorization.extract_expense_from_text",
                   side_effect=categorization.ServizioOccupato()):
            chiedi(client)

        db = db_session()
        n = db.query(models.Expense).filter(models.Expense.user_id == user_id).count()
        db.close()
        assert n == 0

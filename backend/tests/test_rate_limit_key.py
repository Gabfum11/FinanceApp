"""Identificazione del chiamante per i limiti di frequenza.

Dietro un proxy (Render) l'indirizzo visto dal backend è sempre quello del
proxy: senza leggere X-Forwarded-For tutti gli utenti verrebbero contati come
uno solo e si bloccherebbero a vicenda.

L'intestazione però è falsificabile, quindi la si legge solo quando si sa di
stare dietro un proxy fidato.
"""
import pytest
from starlette.requests import Request

import app.state as state

IP_PROXY = "10.0.0.1"
IP_UTENTE_A = "93.45.1.10"
IP_UTENTE_B = "93.45.1.11"


def richiesta(headers=None, client_host=IP_PROXY):
    raw = [(k.lower().encode(), v.encode()) for k, v in (headers or {}).items()]
    return Request({
        "type": "http",
        "headers": raw,
        "client": (client_host, 12345),
        "method": "GET",
        "path": "/",
    })


@pytest.fixture
def dietro_proxy():
    originale = state.TRUST_PROXY_HEADERS
    state.TRUST_PROXY_HEADERS = True
    yield
    state.TRUST_PROXY_HEADERS = originale


@pytest.fixture
def senza_proxy():
    originale = state.TRUST_PROXY_HEADERS
    state.TRUST_PROXY_HEADERS = False
    yield
    state.TRUST_PROXY_HEADERS = originale


class TestSenzaProxy:
    """In locale l'intestazione va ignorata: sarebbe falsificabile."""

    def test_usa_l_indirizzo_della_connessione(self, senza_proxy):
        assert state.client_ip(richiesta()) == IP_PROXY

    def test_intestazione_dichiarata_ignorata(self, senza_proxy):
        """Altrimenti basterebbe dichiarare un IP inventato per aggirare i limiti."""
        got = state.client_ip(richiesta({"X-Forwarded-For": "1.2.3.4"}))
        assert got == IP_PROXY


class TestDietroProxy:
    def test_utenti_diversi_hanno_chiavi_diverse(self, dietro_proxy):
        a = state.client_ip(richiesta({"X-Forwarded-For": IP_UTENTE_A}))
        b = state.client_ip(richiesta({"X-Forwarded-For": IP_UTENTE_B}))
        assert a == IP_UTENTE_A
        assert b == IP_UTENTE_B
        assert a != b, "con la stessa chiave si bloccherebbero a vicenda"

    def test_catena_di_proxy_prende_il_primo(self, dietro_proxy):
        got = state.client_ip(richiesta({"X-Forwarded-For": f"{IP_UTENTE_A}, 10.0.0.5, 10.0.0.9"}))
        assert got == IP_UTENTE_A

    def test_spazi_ignorati(self, dietro_proxy):
        got = state.client_ip(richiesta({"X-Forwarded-For": f"  {IP_UTENTE_A}  , 10.0.0.5"}))
        assert got == IP_UTENTE_A

    def test_intestazione_assente_ricade_sulla_connessione(self, dietro_proxy):
        assert state.client_ip(richiesta()) == IP_PROXY

    def test_intestazione_vuota_ricade_sulla_connessione(self, dietro_proxy):
        assert state.client_ip(richiesta({"X-Forwarded-For": "   "})) == IP_PROXY


class TestChiaveDiAccount:
    """Sugli endpoint a pagamento il limite vale per account, non per indirizzo."""

    def test_stesso_indirizzo_account_diversi(self, dietro_proxy):
        """Due persone sulla stessa rete non devono condividere il contatore."""
        k1 = state.user_or_ip(richiesta({"X-Forwarded-For": IP_UTENTE_A, "Authorization": "Bearer token-1"}))
        k2 = state.user_or_ip(richiesta({"X-Forwarded-For": IP_UTENTE_A, "Authorization": "Bearer token-2"}))
        assert k1 != k2

    def test_stesso_account_indirizzi_diversi(self, dietro_proxy):
        """Cambiando rete il contatore deve seguire l'account."""
        k1 = state.user_or_ip(richiesta({"X-Forwarded-For": IP_UTENTE_A, "Authorization": "Bearer token-1"}))
        k2 = state.user_or_ip(richiesta({"X-Forwarded-For": IP_UTENTE_B, "Authorization": "Bearer token-1"}))
        assert k1 == k2

    def test_senza_token_ricade_sull_indirizzo(self, dietro_proxy):
        assert state.user_or_ip(richiesta({"X-Forwarded-For": IP_UTENTE_A})) == IP_UTENTE_A

    def test_intestazione_non_bearer_ignorata(self, dietro_proxy):
        got = state.user_or_ip(richiesta({"X-Forwarded-For": IP_UTENTE_A, "Authorization": "Basic abc"}))
        assert got == IP_UTENTE_A

    def test_bearer_vuoto_ricade_sull_indirizzo(self, dietro_proxy):
        got = state.user_or_ip(richiesta({"X-Forwarded-For": IP_UTENTE_A, "Authorization": "Bearer   "}))
        assert got == IP_UTENTE_A


class TestLimiteSuExtractPreview:
    """L'endpoint che chiama Groq è l'unico che costa denaro a ogni richiesta."""

    def test_oltre_il_limite_le_richieste_sono_bloccate(self, client, make_user, login_as, make_category):
        from unittest.mock import patch
        from app.main import app

        make_category(name="Altro")
        login_as(make_user(email="quota@example.com"))
        app.state.limiter.enabled = True
        app.state.limiter.reset()

        chiamate_a_groq = 0

        def finta_estrazione(*args, **kwargs):
            nonlocal chiamate_a_groq
            chiamate_a_groq += 1
            return {
                "description": "Pizza", "amount": 15.0, "date": None,
                "category": None, "recurring": False, "frequency": None,
            }

        try:
            with patch("app.business_logic.categorization.extract_expense_from_text", finta_estrazione):
                codici = [
                    client.post(
                        "/expenses/extract-preview",
                        json={"expenseText": "Pizza 15 euro"},
                        headers={"Authorization": "Bearer token-quota"},
                    ).status_code
                    for _ in range(25)
                ]
        finally:
            app.state.limiter.enabled = False

        assert codici.count(200) == 20
        assert codici.count(429) == 5
        assert chiamate_a_groq == 20, "le richieste bloccate non devono raggiungere Groq"

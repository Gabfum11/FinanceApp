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
from app.business_logic import security

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


def token_di(user_id, **extra):
    """Un token di accesso vero, firmato con la chiave del server."""
    return security.create_access_token({"sub": str(user_id), "ver": 0, **extra})


def con_token(token, ip=IP_UTENTE_A):
    return richiesta({"X-Forwarded-For": ip, "Authorization": f"Bearer {token}"})


class TestChiaveDiAccount:
    """Sugli endpoint a pagamento il limite vale per account, non per indirizzo."""

    def test_stesso_indirizzo_account_diversi(self, dietro_proxy):
        """Due persone sulla stessa rete non devono condividere il contatore."""
        assert state.user_or_ip(con_token(token_di(1))) != state.user_or_ip(con_token(token_di(2)))

    def test_stesso_account_indirizzi_diversi(self, dietro_proxy):
        """Cambiando rete il contatore deve seguire l'account."""
        token = token_di(1)
        assert state.user_or_ip(con_token(token, IP_UTENTE_A)) == state.user_or_ip(con_token(token, IP_UTENTE_B))

    def test_token_diversi_stesso_account(self, dietro_proxy):
        """Il token rinnovato, o quello di un altro dispositivo, non azzera il contatore."""
        primo = token_di(1)
        rinnovato = token_di(1, scadenza_diversa=True)
        assert primo != rinnovato
        assert state.user_or_ip(con_token(primo)) == state.user_or_ip(con_token(rinnovato)) == "utente:1"

    def test_token_falso_ricade_sull_indirizzo(self, dietro_proxy):
        """Una firma sbagliata non deve dare un contatore nuovo a ogni richiesta."""
        assert state.user_or_ip(con_token("token-inventato")) == IP_UTENTE_A

    def test_token_di_reset_ricade_sull_indirizzo(self, dietro_proxy):
        token = token_di(1, purpose="password_reset")
        assert state.user_or_ip(con_token(token)) == IP_UTENTE_A

    def test_senza_token_ricade_sull_indirizzo(self, dietro_proxy):
        assert state.user_or_ip(richiesta({"X-Forwarded-For": IP_UTENTE_A})) == IP_UTENTE_A

    def test_intestazione_non_bearer_ignorata(self, dietro_proxy):
        got = state.user_or_ip(richiesta({"X-Forwarded-For": IP_UTENTE_A, "Authorization": "Basic abc"}))
        assert got == IP_UTENTE_A

    def test_bearer_vuoto_ricade_sull_indirizzo(self, dietro_proxy):
        got = state.user_or_ip(richiesta({"X-Forwarded-For": IP_UTENTE_A, "Authorization": "Bearer   "}))
        assert got == IP_UTENTE_A


# I limiti su extract-preview sono verificati in test_rate_limit_groq.py,
# dove sono allineati ai limiti reali del piano Groq.

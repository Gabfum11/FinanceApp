"""Il modulo «Scrivici»: si usa senza account e manda un'email al supporto."""
from unittest.mock import AsyncMock, patch

import pytest

INVIO = "app.business_logic.email_service.send_contact_email"

VALIDO = {"email": "mario@email.it", "argomento": "problema", "messaggio": "L'import si blocca", "browser": "Chrome"}


def test_senza_account_il_messaggio_parte(client):
    with patch(INVIO, new_callable=AsyncMock) as invia:
        r = client.post("/contatto", json=VALIDO)
    assert r.status_code == 200
    invia.assert_awaited_once_with("mario@email.it", "problema", "L'import si blocca", "Chrome")


def test_il_messaggio_arriva_senza_spazi_ai_lati(client):
    with patch(INVIO, new_callable=AsyncMock) as invia:
        client.post("/contatto", json={**VALIDO, "messaggio": "  ciao  \n"})
    assert invia.await_args.args[2] == "ciao"


@pytest.mark.parametrize("dati", [
    {**VALIDO, "email": "non-una-email"},
    {**VALIDO, "argomento": "spam"},
    {**VALIDO, "messaggio": ""},
    {**VALIDO, "messaggio": "   \n "},
    {**VALIDO, "messaggio": "x" * 2001},
])
def test_dati_non_validi_rifiutati(client, dati):
    with patch(INVIO, new_callable=AsyncMock) as invia:
        r = client.post("/contatto", json=dati)
    assert r.status_code == 422
    invia.assert_not_awaited()


def test_campo_nascosto_compilato_scarta_senza_dirlo(client):
    #il bot riceve la stessa risposta di una persona, ma l'email non parte
    with patch(INVIO, new_callable=AsyncMock) as invia:
        r = client.post("/contatto", json={**VALIDO, "sito": "https://spam.test"})
    assert r.status_code == 200
    invia.assert_not_awaited()


def test_invio_non_riuscito_lo_dice(client):
    #un "inviato" falso farebbe aspettare una risposta che non arrivera'
    with patch(INVIO, new_callable=AsyncMock, side_effect=RuntimeError("Brevo giu'")):
        r = client.post("/contatto", json=VALIDO)
    assert r.status_code == 503


@pytest.fixture
def limiter_attivo():
    from app.main import app

    app.state.limiter.enabled = True
    app.state.limiter.reset()
    yield
    app.state.limiter.enabled = False


def test_al_quarto_messaggio_in_un_ora_si_ferma(client, limiter_attivo):
    with patch(INVIO, new_callable=AsyncMock):
        esiti = [client.post("/contatto", json=VALIDO).status_code for _ in range(4)]
    assert esiti == [200, 200, 200, 429]


def test_email_con_risposta_a_chi_scrive():
    import asyncio
    from app.business_logic import email_service

    risposta = AsyncMock()
    risposta.raise_for_status = lambda: None
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=risposta) as post:
        asyncio.run(email_service.send_contact_email("mario@email.it", "idea", "Vorrei   i grafici\nannuali", "Firefox"))
    corpo = post.await_args.kwargs["json"]
    assert corpo["replyTo"] == {"email": "mario@email.it"}
    assert corpo["subject"] == "TrackIt — [Idea] Vorrei i grafici annuali"
    assert "Browser: Firefox" in corpo["textContent"]

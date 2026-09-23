"""Rinnovo del token di accesso.

Senza, alla scadenza l'utente si ritrova al login senza spiegazione. Il client
chiede il rinnovo quando il token e' a meta' vita, così chi apre l'app almeno
una volta al mese resta sempre autenticato.
"""
from datetime import datetime, timedelta, timezone

import pytest

from app import models
from app.business_logic import security
from app.routers.auth import ACCESS_TOKEN_DAYS

PASSWORD = "password123"


def scadenza_di(token: str) -> datetime:
    return datetime.fromtimestamp(security.decode_access_token(token)["exp"], tz=timezone.utc)


class TestRinnovo:
    def test_restituisce_un_token_nuovo(self, client, make_user, login_as):
        login_as(make_user(email="a@t.it", password=PASSWORD))
        r = client.post("/auth/refresh")
        assert r.status_code == 200
        assert "access_token" in r.json()

    def test_il_nuovo_token_e_valido(self, client, db_session, make_user, login_as):
        user_id = make_user(email="b@t.it", password=PASSWORD)
        login_as(user_id)
        nuovo = client.post("/auth/refresh").json()["access_token"]

        db = db_session()
        try:
            assert security.get_current_user(token=nuovo, db=db).id == user_id
        finally:
            db.close()

    def test_la_scadenza_riparte_da_adesso(self, client, make_user, login_as):
        login_as(make_user(email="c@t.it", password=PASSWORD))
        nuovo = client.post("/auth/refresh").json()["access_token"]
        giorni = (scadenza_di(nuovo) - datetime.now(timezone.utc)).days
        assert giorni >= ACCESS_TOKEN_DAYS - 1

    def test_estende_un_token_quasi_scaduto(self, client, db_session, make_user, login_as):
        """È il caso d'uso: il client rinnova quando manca poco."""
        user_id = make_user(email="d@t.it", password=PASSWORD)
        quasi_scaduto = security.create_user_token(
            db_session().query(models.User).filter(models.User.id == user_id).first(),
            expire_minutes=60,  # un'ora di vita residua
        )
        login_as(user_id)
        nuovo = client.post("/auth/refresh").json()["access_token"]
        assert scadenza_di(nuovo) > scadenza_di(quasi_scaduto)

    def test_richiede_autenticazione(self, db_session):
        from fastapi.testclient import TestClient
        from app.main import app

        r = TestClient(app, raise_server_exceptions=False).post("/auth/refresh")
        assert r.status_code == 401

    def test_il_token_rinnovato_porta_la_versione_corrente(self, client, db_session, make_user, login_as):
        """Altrimenti il rinnovo aggirerebbe una revoca appena fatta."""
        user_id = make_user(email="e@t.it", password=PASSWORD)
        login_as(user_id)
        nuovo = client.post("/auth/refresh").json()["access_token"]
        assert security.decode_access_token(nuovo)["ver"] == 0

    def test_dopo_una_revoca_il_token_rinnovato_non_vale(self, client, db_session, make_user, login_as):
        user_id = make_user(email="f@t.it", password=PASSWORD)
        login_as(user_id)
        nuovo = client.post("/auth/refresh").json()["access_token"]

        db = db_session()
        db.query(models.User).filter(models.User.id == user_id).first().token_version += 1
        db.commit()
        db.close()

        db = db_session()
        try:
            with pytest.raises(Exception) as e:
                security.get_current_user(token=nuovo, db=db)
            assert e.value.status_code == 401
        finally:
            db.close()


class TestDurataUnica:
    """La casella "resta connesso" è stata rimossa: la durata è sempre la stessa."""

    @pytest.fixture(autouse=True)
    def utente(self, make_user):
        make_user(email="durata@t.it", password=PASSWORD, verified=True)

    def test_login_senza_remember_me(self, client):
        r = client.post("/auth/login", json={"email": "durata@t.it", "password": PASSWORD})
        giorni = (scadenza_di(r.json()["access_token"]) - datetime.now(timezone.utc)).days
        assert giorni >= ACCESS_TOKEN_DAYS - 1

    def test_remember_me_non_cambia_nulla(self, client):
        """Un client vecchio potrebbe mandarlo ancora: non deve accorciare la sessione."""
        senza = client.post("/auth/login", json={"email": "durata@t.it", "password": PASSWORD})
        con = client.post(
            "/auth/login",
            json={"email": "durata@t.it", "password": PASSWORD, "remember_me": True},
        )
        differenza = abs((scadenza_di(con.json()["access_token"])
                          - scadenza_di(senza.json()["access_token"])).total_seconds())
        assert differenza < 60

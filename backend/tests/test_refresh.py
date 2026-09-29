"""Sessioni: token di accesso breve, refresh token, rinnovo e chiusura.

Il token di accesso dura pochi minuti, così un token rubato vale poco. La
sessione dura di più grazie al refresh token, che /auth/refresh scambia con
una coppia nuova e che /auth/logout, il logout globale e i cambi di password
revocano lato server.
"""
from datetime import datetime, timedelta, timezone

import pytest

from app import models
from app.business_logic import security

PASSWORD = "password123"


def scadenza_di(token: str) -> datetime:
    return datetime.fromtimestamp(security.decode_access_token(token)["exp"], tz=timezone.utc)


def login(client, email):
    r = client.post("/auth/login", json={"email": email, "password": PASSWORD})
    assert r.status_code == 200
    return r.json()


def rinnova(client, refresh_token):
    return client.post("/auth/refresh", json={"refresh_token": refresh_token})


def refresh_token_salvati(db_session, user_id):
    db = db_session()
    n = db.query(models.RefreshToken).filter(models.RefreshToken.user_id == user_id).count()
    db.close()
    return n


class TestLogin:
    def test_restituisce_entrambi_i_token(self, client, make_user):
        make_user(email="a@t.it", password=PASSWORD)
        dati = login(client, "a@t.it")
        assert dati["access_token"]
        assert dati["refresh_token"]
        assert dati["token_type"] == "bearer"

    def test_il_token_di_accesso_dura_pochi_minuti(self, client, make_user):
        make_user(email="b@t.it", password=PASSWORD)
        dati = login(client, "b@t.it")
        durata = scadenza_di(dati["access_token"]) - datetime.now(timezone.utc)
        assert timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES - 1) < durata
        assert durata <= timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)

    def test_ogni_login_apre_una_sessione_separata(self, client, db_session, make_user):
        """Due telefoni con lo stesso account: ognuno ha il suo refresh token."""
        user_id = make_user(email="c@t.it", password=PASSWORD)
        primo = login(client, "c@t.it")["refresh_token"]
        secondo = login(client, "c@t.it")["refresh_token"]
        assert primo != secondo
        assert refresh_token_salvati(db_session, user_id) == 2

    def test_remember_me_non_cambia_nulla(self, client, make_user):
        """Un client vecchio potrebbe mandarlo ancora: non deve cambiare la sessione."""
        make_user(email="d@t.it", password=PASSWORD)
        r = client.post(
            "/auth/login",
            json={"email": "d@t.it", "password": PASSWORD, "remember_me": True},
        )
        assert r.status_code == 200
        assert r.json()["refresh_token"]

    def test_swagger_riceve_solo_il_token_di_accesso(self, client, db_session, make_user):
        """Swagger non sa rinnovare: un refresh token resterebbe nel database inutilizzato."""
        user_id = make_user(email="e@t.it", password=PASSWORD)
        r = client.post("/auth/token", data={"username": "e@t.it", "password": PASSWORD})
        assert r.status_code == 200
        assert r.json()["refresh_token"] is None
        assert refresh_token_salvati(db_session, user_id) == 0


class TestRinnovo:
    def test_restituisce_una_coppia_nuova(self, client, make_user):
        make_user(email="f@t.it", password=PASSWORD)
        vecchi = login(client, "f@t.it")

        r = rinnova(client, vecchi["refresh_token"])

        assert r.status_code == 200
        assert r.json()["refresh_token"] != vecchi["refresh_token"]
        assert r.json()["access_token"]

    def test_il_nuovo_token_di_accesso_e_valido(self, client, db_session, make_user):
        user_id = make_user(email="g@t.it", password=PASSWORD)
        nuovo = rinnova(client, login(client, "g@t.it")["refresh_token"]).json()["access_token"]

        db = db_session()
        try:
            assert security.get_current_user(token=nuovo, db=db).id == user_id
        finally:
            db.close()

    def test_non_richiede_il_token_di_accesso(self, client, make_user):
        """Il client lo chiama proprio quando il token di accesso e' scaduto."""
        make_user(email="h@t.it", password=PASSWORD)
        refresh = login(client, "h@t.it")["refresh_token"]
        r = client.post("/auth/refresh", json={"refresh_token": refresh}, headers={})
        assert r.status_code == 200

    def test_la_catena_di_rinnovi_continua(self, client, make_user):
        make_user(email="i@t.it", password=PASSWORD)
        refresh = login(client, "i@t.it")["refresh_token"]
        for _ in range(3):
            r = rinnova(client, refresh)
            assert r.status_code == 200
            refresh = r.json()["refresh_token"]

    def test_token_inventato_rifiutato(self, client):
        assert rinnova(client, "inventato").status_code == 401

    def test_senza_body_rifiutato(self, client):
        assert client.post("/auth/refresh").status_code == 422

    def test_il_token_di_accesso_non_vale_come_refresh(self, client, make_user):
        make_user(email="l@t.it", password=PASSWORD)
        access = login(client, "l@t.it")["access_token"]
        assert rinnova(client, access).status_code == 401


class TestRiuso:
    def test_un_refresh_token_vale_una_volta(self, client, make_user):
        make_user(email="m@t.it", password=PASSWORD)
        refresh = login(client, "m@t.it")["refresh_token"]
        assert rinnova(client, refresh).status_code == 200
        assert rinnova(client, refresh).status_code == 401

    def test_il_riuso_chiude_tutte_le_sessioni(self, client, db_session, make_user):
        """Chi ha rubato il token e chi l'ha perso non si distinguono: escono entrambi."""
        user_id = make_user(email="n@t.it", password=PASSWORD)
        altro_telefono = login(client, "n@t.it")
        rubato = login(client, "n@t.it")["refresh_token"]
        del_ladro = rinnova(client, rubato).json()

        rinnova(client, rubato)  # il proprietario legittimo usa la sua copia

        assert rinnova(client, del_ladro["refresh_token"]).status_code == 401
        assert rinnova(client, altro_telefono["refresh_token"]).status_code == 401
        db = db_session()
        try:
            with pytest.raises(Exception) as e:
                security.get_current_user(token=del_ladro["access_token"], db=db)
            assert e.value.status_code == 401
        finally:
            db.close()
        assert refresh_token_salvati(db_session, user_id) == 0


class TestLogout:
    def test_chiude_solo_questa_sessione(self, client, make_user):
        make_user(email="o@t.it", password=PASSWORD)
        questo = login(client, "o@t.it")["refresh_token"]
        altro = login(client, "o@t.it")["refresh_token"]

        r = client.post("/auth/logout", json={"refresh_token": questo})

        assert r.status_code == 200
        assert rinnova(client, questo).status_code == 401
        assert rinnova(client, altro).status_code == 200

    def test_token_sconosciuto_non_da_errore(self, client):
        """La sessione risulta chiusa comunque: il client puo' procedere."""
        r = client.post("/auth/logout", json={"refresh_token": "inventato"})
        assert r.status_code == 200


class TestRevocaTotale:
    def test_logout_all_revoca_i_refresh_token(self, client, db_session, make_user, login_as):
        user_id = make_user(email="p@t.it", password=PASSWORD)
        refresh = login(client, "p@t.it")["refresh_token"]
        login_as(user_id)

        client.post("/auth/logout-all")

        assert rinnova(client, refresh).status_code == 401
        assert refresh_token_salvati(db_session, user_id) == 0

    def test_cambio_password_revoca_e_apre_una_sessione_nuova(self, client, make_user, login_as):
        user_id = make_user(email="q@t.it", password=PASSWORD)
        vecchio = login(client, "q@t.it")["refresh_token"]
        login_as(user_id)

        r = client.patch("/auth/change-password", json={
            "current_password": PASSWORD, "new_password": "nuovapassword123",
        })

        assert r.status_code == 200
        assert rinnova(client, vecchio).status_code == 401
        assert rinnova(client, r.json()["refresh_token"]).status_code == 200

    def test_reset_password_revoca_i_refresh_token(self, client, make_user):
        user_id = make_user(email="r@t.it", password=PASSWORD)
        refresh = login(client, "r@t.it")["refresh_token"]
        reset = security.create_access_token({"sub": str(user_id), "purpose": "password_reset"})

        r = client.post(
            "/auth/resetPassword",
            json={"new_password": "nuovapassword123"},
            headers={"Authorization": f"Bearer {reset}"},
        )

        assert r.status_code == 200
        assert rinnova(client, refresh).status_code == 401

    def test_eliminazione_account_cancella_i_refresh_token(self, client, db_session, make_user, login_as):
        user_id = make_user(email="s@t.it", password=PASSWORD)
        login(client, "s@t.it")
        login_as(user_id)

        r = client.request("DELETE", "/auth/me", json={"password": PASSWORD})

        assert r.status_code == 200
        assert refresh_token_salvati(db_session, user_id) == 0


class TestVerificaEmail:
    @pytest.fixture
    def con_otp(self, db_session, make_user):
        def _crea(purpose, verified):
            user_id = make_user(email="otp@t.it", password=PASSWORD, verified=verified)
            db = db_session()
            db.add(models.OtpCode(
                user_id=user_id, code="123456", purpose=purpose,
                expires_at=datetime.now(timezone.utc) + timedelta(minutes=10), attempts=0,
            ))
            db.commit()
            db.close()
            return user_id
        return _crea

    def test_la_verifica_apre_una_sessione(self, client, con_otp):
        con_otp("email_verification", verified=False)
        r = client.post("/auth/verify-otp", json={
            "email": "otp@t.it", "code": "123456", "purpose": "email_verification",
        })
        assert r.status_code == 200
        assert rinnova(client, r.json()["refresh_token"]).status_code == 200

    def test_il_codice_di_reset_non_apre_una_sessione(self, client, db_session, con_otp):
        """Il token di reset serve solo a cambiare la password."""
        user_id = con_otp("password_reset", verified=True)
        r = client.post("/auth/verify-otp", json={
            "email": "otp@t.it", "code": "123456", "purpose": "password_reset",
        })
        assert r.status_code == 200
        assert r.json()["refresh_token"] is None
        assert refresh_token_salvati(db_session, user_id) == 0

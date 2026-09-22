"""Revoca dei token tramite token_version.

Cancellare il token dal dispositivo non basta: quello emesso resta valido fino
alla scadenza, che con "Ricordami" e' 30 giorni. Incrementando token_version
tutti i token di quell'utente decadono subito.
"""
import pytest

from app import models
from app.business_logic import security

PASSWORD = "password123"


def versione(db_session, user_id):
    db = db_session()
    v = db.query(models.User).filter(models.User.id == user_id).first().token_version
    db.close()
    return v


def utente_di(db_session, user_id):
    db = db_session()
    u = db.query(models.User).filter(models.User.id == user_id).first()
    db.close()
    return u


def chiama_con(db_session, token):
    """Esegue get_current_user come farebbe un endpoint autenticato."""
    db = db_session()
    try:
        return security.get_current_user(token=token, db=db)
    finally:
        db.close()


class TestVersioneNelToken:
    def test_un_nuovo_utente_parte_da_zero(self, db_session, make_user):
        assert versione(db_session, make_user(email="a@t.it")) == 0

    def test_il_token_porta_la_versione(self, db_session, make_user):
        user_id = make_user(email="b@t.it")
        token = security.create_user_token(utente_di(db_session, user_id))
        assert security.decode_access_token(token)["ver"] == 0

    def test_un_token_valido_viene_accettato(self, db_session, make_user):
        user_id = make_user(email="c@t.it")
        token = security.create_user_token(utente_di(db_session, user_id))
        assert chiama_con(db_session, token).id == user_id


class TestRevoca:
    def test_incrementando_la_versione_il_token_decade(self, db_session, make_user):
        user_id = make_user(email="d@t.it")
        token = security.create_user_token(utente_di(db_session, user_id))
        assert chiama_con(db_session, token).id == user_id  # prima funziona

        db = db_session()
        db.query(models.User).filter(models.User.id == user_id).first().token_version += 1
        db.commit()
        db.close()

        with pytest.raises(Exception) as e:
            chiama_con(db_session, token)
        assert e.value.status_code == 401

    def test_dopo_la_revoca_un_token_nuovo_funziona(self, db_session, make_user):
        user_id = make_user(email="e@t.it")
        db = db_session()
        db.query(models.User).filter(models.User.id == user_id).first().token_version += 1
        db.commit()
        db.close()

        nuovo = security.create_user_token(utente_di(db_session, user_id))
        assert chiama_con(db_session, nuovo).id == user_id

    def test_la_revoca_non_tocca_gli_altri_utenti(self, db_session, make_user):
        mio_id = make_user(email="f@t.it")
        altro_id = make_user(email="g@t.it")
        token_altrui = security.create_user_token(utente_di(db_session, altro_id))

        db = db_session()
        db.query(models.User).filter(models.User.id == mio_id).first().token_version += 1
        db.commit()
        db.close()

        assert chiama_con(db_session, token_altrui).id == altro_id

    def test_token_senza_versione_trattato_come_zero(self, db_session, make_user):
        """I token emessi prima di questa funzione non hanno il campo: il deploy
        non deve disconnettere chi era gia' autenticato."""
        user_id = make_user(email="h@t.it")
        vecchio = security.create_access_token({"sub": str(user_id)})  # senza "ver"
        assert chiama_con(db_session, vecchio).id == user_id


class TestLogoutAll:
    def test_chiude_le_sessioni(self, client, db_session, make_user, login_as):
        user_id = make_user(email="i@t.it", password=PASSWORD)
        login_as(user_id)
        token = security.create_user_token(utente_di(db_session, user_id))

        r = client.post("/auth/logout-all")
        assert r.status_code == 200
        assert versione(db_session, user_id) == 1

        with pytest.raises(Exception) as e:
            chiama_con(db_session, token)
        assert e.value.status_code == 401

    def test_dopo_il_logout_si_rientra_con_un_nuovo_login(self, client, db_session, make_user, login_as):
        user_id = make_user(email="l@t.it", password=PASSWORD)
        login_as(user_id)
        client.post("/auth/logout-all")

        r = client.post("/auth/login", json={"email": "l@t.it", "password": PASSWORD})
        assert r.status_code == 200
        assert chiama_con(db_session, r.json()["access_token"]).id == user_id


class TestCambioPassword:
    def test_invalida_i_token_esistenti(self, client, db_session, make_user, login_as):
        """Chi avesse rubato un token resterebbe dentro con la password vecchia."""
        user_id = make_user(email="m@t.it", password=PASSWORD)
        login_as(user_id)
        token_rubato = security.create_user_token(utente_di(db_session, user_id))

        r = client.patch("/auth/change-password", json={
            "current_password": PASSWORD, "new_password": "nuovapassword123",
        })
        assert r.status_code == 200

        with pytest.raises(Exception) as e:
            chiama_con(db_session, token_rubato)
        assert e.value.status_code == 401

    def test_restituisce_un_token_valido_a_chi_l_ha_cambiata(self, client, db_session, make_user, login_as):
        """Altrimenti chi cambia password verrebbe disconnesso dal proprio incremento."""
        user_id = make_user(email="n@t.it", password=PASSWORD)
        login_as(user_id)

        r = client.patch("/auth/change-password", json={
            "current_password": PASSWORD, "new_password": "nuovapassword123",
        })
        assert "access_token" in r.json()
        assert chiama_con(db_session, r.json()["access_token"]).id == user_id

    def test_password_errata_non_revoca_nulla(self, client, db_session, make_user, login_as):
        user_id = make_user(email="o@t.it", password=PASSWORD)
        login_as(user_id)
        r = client.patch("/auth/change-password", json={
            "current_password": "sbagliata", "new_password": "nuovapassword123",
        })
        assert r.status_code == 401
        assert versione(db_session, user_id) == 0


class TestTokenDiReset:
    def test_il_token_di_reset_non_porta_la_versione(self, db_session, make_user):
        """Il reset incrementa la versione: se il token la portasse, si
        invaliderebbe prima di poter essere usato."""
        user_id = make_user(email="p@t.it")
        token = security.create_access_token({"sub": str(user_id), "purpose": "password_reset"})
        db = db_session()
        try:
            assert security.get_reset_password_user(token=token, db=db).id == user_id
        finally:
            db.close()

    def test_resta_valido_anche_dopo_un_incremento(self, db_session, make_user):
        user_id = make_user(email="q@t.it")
        token = security.create_access_token({"sub": str(user_id), "purpose": "password_reset"})

        db = db_session()
        db.query(models.User).filter(models.User.id == user_id).first().token_version += 5
        db.commit()
        db.close()

        db = db_session()
        try:
            assert security.get_reset_password_user(token=token, db=db).id == user_id
        finally:
            db.close()

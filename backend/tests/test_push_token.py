"""Registrazione del telefono per le notifiche push.

I promemoria partono dal server verso il push token salvato sull'utente: un
token sbagliato o rimasto sull'account sbagliato manda le notifiche a vuoto,
o peggio a un'altra persona.
"""
from app import models

TOKEN = "ExponentPushToken[abc123]"


def token_di(db_session, user_id):
    db = db_session()
    t = db.query(models.User).filter(models.User.id == user_id).first().push_token
    db.close()
    return t


class TestRegistrazione:
    def test_salva_il_token(self, client, db_session, make_user, login_as):
        user_id = make_user(email="a@t.it")
        login_as(user_id)
        r = client.put("/auth/push-token", json={"token": TOKEN})
        assert r.status_code == 200
        assert token_di(db_session, user_id) == TOKEN

    def test_un_nuovo_token_sostituisce_il_vecchio(self, client, db_session, make_user, login_as):
        user_id = make_user(email="b@t.it")
        login_as(user_id)
        client.put("/auth/push-token", json={"token": TOKEN})
        client.put("/auth/push-token", json={"token": "ExponentPushToken[nuovo]"})
        assert token_di(db_session, user_id) == "ExponentPushToken[nuovo]"

    def test_rifiuta_un_formato_diverso_da_expo(self, client, db_session, make_user, login_as):
        user_id = make_user(email="c@t.it")
        login_as(user_id)
        r = client.put("/auth/push-token", json={"token": "ciao"})
        assert r.status_code == 422
        assert token_di(db_session, user_id) is None


class TestTelefonoCondiviso:
    def test_il_token_passa_al_nuovo_account(self, client, db_session, make_user, login_as):
        """Logout e login con un altro utente sullo stesso telefono: i promemoria
        del primo non devono arrivare a chi usa il telefono adesso."""
        vecchio_id = make_user(email="d@t.it")
        nuovo_id = make_user(email="e@t.it")

        login_as(vecchio_id)
        client.put("/auth/push-token", json={"token": TOKEN})
        login_as(nuovo_id)
        client.put("/auth/push-token", json={"token": TOKEN})

        assert token_di(db_session, nuovo_id) == TOKEN
        assert token_di(db_session, vecchio_id) is None

    def test_non_tocca_gli_altri_telefoni(self, client, db_session, make_user, login_as):
        altro_id = make_user(email="f@t.it")
        mio_id = make_user(email="g@t.it")

        login_as(altro_id)
        client.put("/auth/push-token", json={"token": "ExponentPushToken[altro]"})
        login_as(mio_id)
        client.put("/auth/push-token", json={"token": TOKEN})

        assert token_di(db_session, altro_id) == "ExponentPushToken[altro]"


class TestRimozione:
    def test_delete_toglie_il_token(self, client, db_session, make_user, login_as):
        user_id = make_user(email="h@t.it")
        login_as(user_id)
        client.put("/auth/push-token", json={"token": TOKEN})
        r = client.delete("/auth/push-token")
        assert r.status_code == 200
        assert token_di(db_session, user_id) is None

    def test_logout_all_toglie_il_token(self, client, db_session, make_user, login_as):
        """Il telefono perso non deve continuare a ricevere i promemoria."""
        user_id = make_user(email="i@t.it")
        login_as(user_id)
        client.put("/auth/push-token", json={"token": TOKEN})
        client.post("/auth/logout-all")
        assert token_di(db_session, user_id) is None

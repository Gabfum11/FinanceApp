"""Valuta e lingua scelte dal Profilo.

Le spese sono numeri senza valuta: la valuta decide solo come mostrarli, quindi
cambiarla non deve toccare nessun importo gia' salvato.
"""
from app import models


class TestPreferenze:
    def test_un_account_nuovo_parte_in_euro_e_in_italiano(self, client, make_user, login_as):
        login_as(make_user(email="a@t.it"))
        dati = client.get("/auth/me").json()
        assert dati["currency"] == "EUR"
        assert dati["language"] == "it"

    def test_cambia_la_valuta(self, client, make_user, login_as):
        login_as(make_user(email="b@t.it"))
        r = client.patch("/auth/preferences", json={"currency": "GBP"})
        assert r.status_code == 200
        assert r.json()["currency"] == "GBP"
        assert client.get("/auth/me").json()["currency"] == "GBP"

    def test_cambiare_una_non_tocca_l_altra(self, client, make_user, login_as):
        login_as(make_user(email="c@t.it"))
        client.patch("/auth/preferences", json={"language": "en"})
        dati = client.patch("/auth/preferences", json={"currency": "USD"}).json()
        assert dati["language"] == "en"
        assert dati["currency"] == "USD"

    def test_valuta_non_offerta_rifiutata(self, client, make_user, login_as):
        login_as(make_user(email="d@t.it"))
        r = client.patch("/auth/preferences", json={"currency": "JPY"})
        assert r.status_code == 422
        assert client.get("/auth/me").json()["currency"] == "EUR"

    def test_lingua_non_offerta_rifiutata(self, client, make_user, login_as):
        login_as(make_user(email="e@t.it"))
        assert client.patch("/auth/preferences", json={"language": "fr"}).status_code == 422

    def test_gli_importi_salvati_non_cambiano(self, client, db_session, make_user, login_as):
        user_id = make_user(email="f@t.it")
        login_as(user_id)
        client.post("/expenses/", json={"description": "Pizza", "amount": 15.5, "date": "2026-10-01"})
        client.patch("/auth/preferences", json={"currency": "USD"})
        db = db_session()
        spesa = db.query(models.Expense).filter(models.Expense.user_id == user_id).one()
        assert spesa.amount == 15.5
        db.close()

    def test_vale_solo_per_il_proprio_account(self, client, make_user, login_as):
        primo = make_user(email="g@t.it")
        secondo = make_user(email="h@t.it")
        login_as(primo)
        client.patch("/auth/preferences", json={"currency": "CHF"})
        login_as(secondo)
        assert client.get("/auth/me").json()["currency"] == "EUR"

    def test_serve_essere_autenticati(self, client):
        assert client.patch("/auth/preferences", json={"currency": "USD"}).status_code == 401

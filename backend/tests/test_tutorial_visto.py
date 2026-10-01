"""Tutorial di primo avvio, segnato per account.

Salvato sul telefono, un account nuovo creato dove qualcuno l'aveva gia' visto
non lo vedeva mai: il flag sta sull'utente e /auth/me lo restituisce all'app.
"""


class TestTutorialVisto:
    def test_un_account_nuovo_non_lo_ha_visto(self, client, make_user, login_as):
        login_as(make_user(email="a@t.it"))
        r = client.get("/auth/me")
        assert r.status_code == 200
        assert r.json()["tutorial_visto"] is False

    def test_dopo_averlo_segnato_risulta_visto(self, client, make_user, login_as):
        login_as(make_user(email="b@t.it"))
        r = client.put("/auth/tutorial-visto")
        assert r.status_code == 200
        assert client.get("/auth/me").json()["tutorial_visto"] is True

    def test_segnarlo_due_volte_non_cambia_nulla(self, client, make_user, login_as):
        login_as(make_user(email="c@t.it"))
        client.put("/auth/tutorial-visto")
        r = client.put("/auth/tutorial-visto")
        assert r.status_code == 200
        assert client.get("/auth/me").json()["tutorial_visto"] is True

    def test_vale_solo_per_il_proprio_account(self, client, make_user, login_as):
        """Telefono condiviso: chi l'ha visto non lo toglie a un altro account."""
        primo = make_user(email="d@t.it")
        secondo = make_user(email="e@t.it")
        login_as(primo)
        client.put("/auth/tutorial-visto")
        login_as(secondo)
        assert client.get("/auth/me").json()["tutorial_visto"] is False

    def test_serve_essere_autenticati(self, client):
        assert client.put("/auth/tutorial-visto").status_code == 401

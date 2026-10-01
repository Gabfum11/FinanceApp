"""Chiamate all'API dal browser (versione web dell'app).

Il browser blocca le richieste verso un altro dominio se il server non
autorizza il sito: senza CORS la web app vede solo "Failed to fetch".
Il conftest autorizza https://sito-autorizzato.test.
"""
from app.main import origini_web

AUTORIZZATO = "https://sito-autorizzato.test"
ESTRANEO = "https://sito-estraneo.test"


def preflight(client, origine):
    #la domanda che il browser fa prima di una richiesta con Authorization
    return client.options(
        "/auth/me",
        headers={
            "Origin": origine,
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization",
        },
    )


class TestPreflight:
    def test_il_sito_autorizzato_passa(self, client):
        r = preflight(client, AUTORIZZATO)
        assert r.status_code == 200
        assert r.headers["access-control-allow-origin"] == AUTORIZZATO

    def test_un_altro_sito_viene_rifiutato(self, client):
        r = preflight(client, ESTRANEO)
        assert r.status_code == 400
        assert "access-control-allow-origin" not in r.headers


class TestRisposte:
    def test_anche_gli_errori_portano_l_intestazione(self, client):
        """Senza, il browser nasconderebbe il 401 dietro un "Failed to fetch"."""
        r = client.get("/auth/me", headers={"Origin": AUTORIZZATO})
        assert r.status_code == 401
        assert r.headers["access-control-allow-origin"] == AUTORIZZATO

    def test_nessun_cookie_tra_siti(self, client):
        r = client.get("/auth/me", headers={"Origin": AUTORIZZATO})
        assert "access-control-allow-credentials" not in r.headers

    def test_l_app_nativa_non_cambia(self, client):
        """Le app native non mandano Origin: nessuna intestazione CORS."""
        r = client.get("/auth/me")
        assert "access-control-allow-origin" not in r.headers


class TestOriginiWeb:
    def test_elenco_separato_da_virgole(self):
        assert origini_web("http://localhost:8081, https://gabfum11.github.io") == [
            "http://localhost:8081",
            "https://gabfum11.github.io",
        ]

    def test_toglie_la_barra_finale(self):
        assert origini_web("https://gabfum11.github.io/") == ["https://gabfum11.github.io"]

    def test_vuoto_nessun_sito(self):
        assert origini_web("") == []
        assert origini_web(" , ") == []

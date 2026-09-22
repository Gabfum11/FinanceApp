"""Intestazioni di sicurezza e documentazione non esposta in produzione.

La documentazione interattiva elenca ogni endpoint con parametri e risposte:
gli endpoint restano protetti, ma e' una mappa regalata a chi cerca un punto
debole.
"""
import importlib

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def app_produzione(monkeypatch):
    """Ricarica l'app come se girasse su Render."""
    monkeypatch.setenv("ENVIRONMENT", "production")
    import app.main

    ricaricata = importlib.reload(app.main)
    yield ricaricata
    monkeypatch.delenv("ENVIRONMENT", raising=False)
    importlib.reload(app.main)


class TestIntestazioni:
    @pytest.mark.parametrize(
        "intestazione,valore",
        [
            ("X-Content-Type-Options", "nosniff"),
            ("X-Frame-Options", "DENY"),
            ("Referrer-Policy", "no-referrer"),
        ],
    )
    def test_presenti_su_ogni_risposta(self, client, intestazione, valore):
        assert client.get("/health").headers.get(intestazione) == valore

    def test_permessi_negati_esplicitamente(self, client):
        permessi = client.get("/health").headers.get("Permissions-Policy", "")
        for funzione in ("camera", "microphone", "geolocation"):
            assert f"{funzione}=()" in permessi

    def test_presenti_anche_sugli_errori(self, client):
        """Un 404 passa comunque dal browser: le intestazioni servono anche lì."""
        r = client.get("/percorso-inesistente")
        assert r.status_code == 404
        assert r.headers.get("X-Content-Type-Options") == "nosniff"

    def test_hsts_assente_in_sviluppo(self, client):
        """In locale non c'è certificato: forzare HTTPS romperebbe lo sviluppo."""
        assert "Strict-Transport-Security" not in client.get("/health").headers

    def test_hsts_presente_in_produzione(self, app_produzione):
        c = TestClient(app_produzione.app, raise_server_exceptions=False)
        hsts = c.get("/health").headers.get("Strict-Transport-Security", "")
        assert "max-age=31536000" in hsts
        assert "includeSubDomains" in hsts


class TestDocumentazione:
    @pytest.mark.parametrize("percorso", ["/docs", "/redoc", "/openapi.json"])
    def test_disponibile_in_sviluppo(self, client, percorso):
        assert client.get(percorso).status_code == 200

    @pytest.mark.parametrize("percorso", ["/docs", "/redoc", "/openapi.json"])
    def test_non_raggiungibile_in_produzione(self, app_produzione, percorso):
        c = TestClient(app_produzione.app, raise_server_exceptions=False)
        assert c.get(percorso).status_code == 404

    def test_gli_endpoint_continuano_a_funzionare(self, app_produzione):
        """Nascondere la documentazione non deve disattivare le API."""
        c = TestClient(app_produzione.app, raise_server_exceptions=False)
        assert c.get("/").status_code == 200
        assert c.get("/health").status_code == 200

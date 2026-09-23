"""Esportazione CSV di spese e abbonamenti.

Oltre all'uso pratico, risponde al diritto di portabilità (art. 20 GDPR).
I dettagli del formato contano: un CSV che Excel apre male è inutilizzabile.
"""
from datetime import date, timedelta

import pytest

from app import models


@pytest.fixture
def utente(make_user, login_as):
    user_id = make_user(email="export@example.com")
    login_as(user_id)
    return user_id


@pytest.fixture
def categoria(db_session):
    """Sottocategoria con il suo gruppo, come nella gerarchia reale."""
    db = db_session()
    gruppo = models.Category(name="Casa", keywords=None, parent_id=None)
    db.add(gruppo)
    db.commit()
    db.refresh(gruppo)
    figlia = models.Category(name="Bolletta energia", keywords=None, parent_id=gruppo.id)
    db.add(figlia)
    db.commit()
    db.refresh(figlia)
    cid = figlia.id
    db.close()
    return cid


def righe_di(testo: str) -> list[str]:
    return [r for r in testo.lstrip("﻿").strip().split("\r\n") if r]


class TestFormato:
    """Dettagli che decidono se Excel apre il file correttamente."""

    def test_inizia_con_il_bom(self, client, utente):
        """Senza, Excel legge "Caffè" come "CaffÃ¨"."""
        assert client.get("/export/expenses.csv").text.startswith("﻿")

    def test_separatore_punto_e_virgola(self, client, utente):
        """Con la virgola Excel italiano mette tutta la riga in una colonna."""
        intestazione = righe_di(client.get("/export/expenses.csv").text)[0]
        assert ";" in intestazione
        assert intestazione.count(",") == 0

    def test_importi_con_virgola_decimale(self, client, utente, categoria):
        client.post("/expenses/", json={"description": "Enel", "amount": 85.5,
                                        "date": "2026-09-01", "category_id": categoria})
        righe = righe_di(client.get("/export/expenses.csv").text)
        assert "85,50" in righe[1]

    def test_nome_file_con_la_data(self, client, utente):
        disposizione = client.get("/export/expenses.csv").headers["content-disposition"]
        assert "attachment" in disposizione
        assert date.today().isoformat() in disposizione

    def test_tipo_di_contenuto(self, client, utente):
        assert "text/csv" in client.get("/export/expenses.csv").headers["content-type"]


class TestSpese:
    def test_intestazioni(self, client, utente):
        assert righe_di(client.get("/export/expenses.csv").text)[0] == \
            "Data;Descrizione;Importo;Categoria;Gruppo"

    def test_una_riga_per_spesa(self, client, utente, categoria):
        for i in range(3):
            client.post("/expenses/", json={"description": f"Spesa {i}", "amount": 10.0,
                                            "date": "2026-09-01", "category_id": categoria})
        assert len(righe_di(client.get("/export/expenses.csv").text)) == 4  # intestazione + 3

    def test_include_categoria_e_gruppo(self, client, utente, categoria):
        client.post("/expenses/", json={"description": "Enel", "amount": 85.0,
                                        "date": "2026-09-01", "category_id": categoria})
        riga = righe_di(client.get("/export/expenses.csv").text)[1]
        assert "Bolletta energia" in riga
        assert "Casa" in riga

    def test_spesa_senza_categoria(self, client, utente):
        client.post("/expenses/", json={"description": "Senza", "amount": 5.0, "date": "2026-09-01"})
        riga = righe_di(client.get("/export/expenses.csv").text)[1]
        assert riga.endswith(";;"), "categoria e gruppo restano vuoti, non 'None'"

    def test_ordinate_dalla_piu_recente(self, client, utente):
        client.post("/expenses/", json={"description": "Vecchia", "amount": 1.0, "date": "2026-01-01"})
        client.post("/expenses/", json={"description": "Recente", "amount": 2.0, "date": "2026-09-01"})
        righe = righe_di(client.get("/export/expenses.csv").text)
        assert "Recente" in righe[1]

    def test_solo_le_proprie_spese(self, client, db_session, make_user, login_as):
        altro = make_user(email="altro@example.com")
        db = db_session()
        db.add(models.Expense(description="Altrui", amount=99.0, date=date.today(), user_id=altro))
        db.commit()
        db.close()

        login_as(make_user(email="io@example.com"))
        assert "Altrui" not in client.get("/export/expenses.csv").text

    def test_nessuna_spesa_solo_intestazione(self, client, utente):
        """Il client distingue questo caso per non condividere un file vuoto."""
        assert len(righe_di(client.get("/export/expenses.csv").text)) == 1


class TestAbbonamenti:
    def test_intestazioni(self, client, utente):
        assert righe_di(client.get("/export/subscriptions.csv").text)[0] == \
            "Descrizione;Importo;Frequenza;Prossimo addebito;Stato;Rinnovo;Categoria;Gruppo"

    def test_frequenza_in_italiano(self, client, utente):
        client.post("/subscriptions/", json={"description": "Netflix", "amount": 12.0,
                                             "frequency": "monthly"})
        riga = righe_di(client.get("/export/subscriptions.csv").text)[1]
        assert "Mensile" in riga
        assert "monthly" not in riga

    def test_stato_e_rinnovo_leggibili(self, client, db_session, utente):
        db = db_session()
        db.add(models.Subscriptions(description="Pausa", amount=5.0, frequency="weekly",
                                    next_date=date.today() + timedelta(days=7),
                                    user_id=utente, is_active=False, auto_renew=False))
        db.commit()
        db.close()
        riga = righe_di(client.get("/export/subscriptions.csv").text)[1]
        assert "In pausa" in riga
        assert "Manuale" in riga

    def test_solo_i_propri_abbonamenti(self, client, db_session, make_user, login_as):
        altro = make_user(email="altro2@example.com")
        db = db_session()
        db.add(models.Subscriptions(description="Altrui", amount=9.0, frequency="monthly",
                                    next_date=date.today() + timedelta(days=30), user_id=altro))
        db.commit()
        db.close()

        login_as(make_user(email="io2@example.com"))
        assert "Altrui" not in client.get("/export/subscriptions.csv").text


class TestAutenticazione:
    @pytest.mark.parametrize("percorso", ["/export/expenses.csv", "/export/subscriptions.csv"])
    def test_richiede_il_token(self, db_session, percorso):
        from fastapi.testclient import TestClient
        from app.main import app

        assert TestClient(app, raise_server_exceptions=False).get(percorso).status_code == 401

"""Spese e abbonamenti: creazione, modifica, rinnovi, isolamento tra utenti."""
from datetime import date, timedelta

import pytest

from app import models


@pytest.fixture
def utente(make_user, login_as):
    user_id = make_user(email="utente@example.com", password="password123")
    login_as(user_id)
    return user_id


@pytest.fixture
def categoria(make_category):
    return make_category(name="Cibo", keywords="pizza")


def conta_spese(db_session, user_id):
    db = db_session()
    n = db.query(models.Expense).filter(models.Expense.user_id == user_id).count()
    db.close()
    return n


class TestModificaSpesa:
    def test_modifica_solo_il_campo_inviato(self, client, utente, categoria):
        r = client.post(
            "/expenses/",
            json={"description": "Pizza", "amount": 15.0, "date": "2026-09-20", "category_id": categoria},
        )
        expense_id = r.json()["id"]

        r = client.patch(f"/expenses/{expense_id}", json={"amount": 18.5})
        assert r.status_code == 200
        assert r.json()["amount"] == 18.5
        assert r.json()["description"] == "Pizza", "gli altri campi non vanno toccati"
        assert r.json()["date"] == "2026-09-20"

    def test_categoria_inesistente(self, client, utente, categoria):
        r = client.post(
            "/expenses/",
            json={"description": "Pizza", "amount": 15.0, "date": "2026-09-20", "category_id": categoria},
        )
        expense_id = r.json()["id"]
        r = client.patch(f"/expenses/{expense_id}", json={"category_id": 9999})
        assert r.status_code == 404

    def test_importo_negativo_rifiutato(self, client, utente, categoria):
        r = client.post(
            "/expenses/",
            json={"description": "Pizza", "amount": 15.0, "date": "2026-09-20", "category_id": categoria},
        )
        expense_id = r.json()["id"]
        r = client.patch(f"/expenses/{expense_id}", json={"amount": -5})
        assert r.status_code == 422

    def test_spesa_inesistente(self, client, utente):
        assert client.patch("/expenses/9999", json={"amount": 5}).status_code == 404


class TestIsolamentoTraUtenti:
    """Il controllo più importante: nessuno deve toccare i dati di un altro."""

    def test_non_si_modifica_la_spesa_altrui(self, client, db_session, make_user, login_as):
        altro_id = make_user(email="altro@example.com", password="password123")
        db = db_session()
        spesa = models.Expense(description="Altrui", amount=99.0, date=date.today(), user_id=altro_id)
        db.add(spesa)
        db.commit()
        db.refresh(spesa)
        spesa_id = spesa.id
        db.close()

        mio_id = make_user(email="io@example.com", password="password123")
        login_as(mio_id)

        assert client.patch(f"/expenses/{spesa_id}", json={"amount": 1.0}).status_code == 404
        assert client.delete(f"/expenses/{spesa_id}").status_code == 404
        assert client.get(f"/expenses/{spesa_id}").status_code == 404

    def test_la_lista_mostra_solo_le_proprie_spese(self, client, db_session, make_user, login_as):
        altro_id = make_user(email="altro2@example.com")
        db = db_session()
        db.add(models.Expense(description="Altrui", amount=99.0, date=date.today(), user_id=altro_id))
        db.commit()
        db.close()

        mio_id = make_user(email="io2@example.com")
        login_as(mio_id)
        r = client.get("/expenses/")
        assert r.status_code == 200
        assert r.json() == []


class TestAbbonamenti:
    def test_crea_gli_arretrati_dalla_data_di_partenza(self, client, db_session, utente):
        r = client.post(
            "/subscriptions/",
            json={
                "description": "Netflix",
                "amount": 12.0,
                "frequency": "monthly",
                "start_date": (date.today() - timedelta(days=60)).isoformat(),
            },
        )
        assert r.status_code == 200
        assert conta_spese(db_session, utente) >= 2, "i rinnovi già avvenuti diventano spese"

    def test_troppi_arretrati_rifiutati(self, client, db_session, utente):
        r = client.post(
            "/subscriptions/",
            json={
                "description": "Vecchio",
                "amount": 12.0,
                "frequency": "monthly",
                "start_date": (date.today() - timedelta(days=365 * 5)).isoformat(),
            },
        )
        assert r.status_code == 422
        assert conta_spese(db_session, utente) == 0, "niente deve essere scritto se la richiesta fallisce"

    def test_sposta_il_prossimo_addebito_senza_toccare_lo_storico(self, client, db_session, utente):
        r = client.post(
            "/subscriptions/",
            json={
                "description": "Netflix",
                "amount": 12.0,
                "frequency": "monthly",
                "start_date": (date.today() - timedelta(days=60)).isoformat(),
            },
        )
        sub_id = r.json()["id"]
        spese_prima = conta_spese(db_session, utente)

        nuova = (date.today() + timedelta(days=20)).isoformat()
        r = client.patch(f"/subscriptions/{sub_id}", json={"next_date": nuova})
        assert r.status_code == 200
        assert r.json()["next_date"] == nuova
        assert conta_spese(db_session, utente) == spese_prima

    def test_data_passata_rifiutata(self, client, utente):
        r = client.post(
            "/subscriptions/",
            json={"description": "X", "amount": 5.0, "frequency": "monthly"},
        )
        sub_id = r.json()["id"]
        r = client.patch(
            f"/subscriptions/{sub_id}",
            json={"next_date": (date.today() - timedelta(days=5)).isoformat()},
        )
        assert r.status_code == 422

    def test_auto_renew_modificabile(self, client, utente):
        r = client.post(
            "/subscriptions/",
            json={"description": "X", "amount": 5.0, "frequency": "monthly"},
        )
        sub_id = r.json()["id"]
        r = client.patch(f"/subscriptions/{sub_id}", json={"auto_renew": False})
        assert r.status_code == 200
        assert r.json()["auto_renew"] is False


class TestRinnoviAutomatici:
    """I rinnovi scaduti devono comparire senza dover aprire la schermata Abbonamenti."""

    @pytest.fixture
    def abbonamento_scaduto(self, db_session, utente):
        db = db_session()
        db.add(
            models.Subscriptions(
                description="Netflix",
                amount=12.0,
                frequency="monthly",
                next_date=date.today() - timedelta(days=90),
                user_id=utente,
                is_active=True,
                auto_renew=True,
            )
        )
        db.commit()
        db.close()

    @pytest.mark.parametrize(
        "endpoint",
        ["/budget/status", "/expenses/", "/expenses/stats", "/expenses/weekly-stats"],
    )
    def test_ogni_endpoint_di_lettura_genera_i_rinnovi(
        self, client, db_session, utente, abbonamento_scaduto, endpoint
    ):
        assert conta_spese(db_session, utente) == 0
        assert client.get(endpoint).status_code == 200
        assert conta_spese(db_session, utente) >= 3

    def test_chiamate_ripetute_non_duplicano(self, client, db_session, utente, abbonamento_scaduto):
        client.get("/expenses/")
        dopo_la_prima = conta_spese(db_session, utente)
        client.get("/expenses/")
        client.get("/budget/status")
        client.get("/subscriptions/")
        assert conta_spese(db_session, utente) == dopo_la_prima

    def test_auto_renew_disattivato_non_genera_nulla(self, client, db_session, utente):
        db = db_session()
        db.add(
            models.Subscriptions(
                description="Manuale",
                amount=9.0,
                frequency="monthly",
                next_date=date.today() - timedelta(days=90),
                user_id=utente,
                is_active=True,
                auto_renew=False,
            )
        )
        db.commit()
        db.close()

        client.get("/expenses/")
        assert conta_spese(db_session, utente) == 0


class TestHealth:
    def test_database_raggiungibile(self, client):
        r = client.get("/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"

    def test_database_irraggiungibile(self, client, db_session):
        from app.database import get_db
        from app.main import app

        class SessioneRotta:
            def execute(self, *a, **k):
                raise OSError("connection refused")

            def close(self):
                pass

        app.dependency_overrides[get_db] = lambda: iter([SessioneRotta()])
        r = client.get("/health")
        assert r.status_code == 503, "un monitor esterno deve vedere un codice di errore"
        assert r.json()["status"] == "unhealthy"

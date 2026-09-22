"""Azioni sugli abbonamenti dalla schermata: pausa, riattiva, "Ho rinnovato", elimina."""
from datetime import date, timedelta

import pytest

from app import models


@pytest.fixture
def utente(make_user, login_as):
    user_id = make_user(email="sub@example.com", password="password123")
    login_as(user_id)
    return user_id


@pytest.fixture
def crea_abbonamento(db_session, utente):
    def _crea(frequency="monthly", giorni_al_rinnovo=30, is_active=True, auto_renew=True, amount=12.0):
        db = db_session()
        sub = models.Subscriptions(
            description="Netflix",
            amount=amount,
            frequency=frequency,
            next_date=date.today() + timedelta(days=giorni_al_rinnovo),
            user_id=utente,
            is_active=is_active,
            auto_renew=auto_renew,
        )
        db.add(sub)
        db.commit()
        db.refresh(sub)
        sub_id = sub.id
        db.close()
        return sub_id

    return _crea


def leggi_sub(db_session, sub_id):
    db = db_session()
    sub = db.query(models.Subscriptions).filter(models.Subscriptions.id == sub_id).first()
    dati = None if sub is None else {
        "is_active": sub.is_active,
        "next_date": sub.next_date,
        "amount": sub.amount,
    }
    db.close()
    return dati


def conta_spese(db_session, user_id):
    db = db_session()
    n = db.query(models.Expense).filter(models.Expense.user_id == user_id).count()
    db.close()
    return n


class TestPausaERiattivazione:
    def test_mette_in_pausa(self, client, db_session, crea_abbonamento):
        sub_id = crea_abbonamento()
        r = client.patch(f"/subscriptions/{sub_id}/toggle")
        assert r.status_code == 200
        assert r.json()["is_active"] is False
        assert leggi_sub(db_session, sub_id)["is_active"] is False

    def test_riattiva(self, client, db_session, crea_abbonamento):
        sub_id = crea_abbonamento(is_active=False)
        r = client.patch(f"/subscriptions/{sub_id}/toggle")
        assert r.status_code == 200
        assert r.json()["is_active"] is True

    def test_riattivando_il_rinnovo_riparte_da_oggi(self, client, db_session, crea_abbonamento):
        sub_id = crea_abbonamento(is_active=False, giorni_al_rinnovo=-60)
        client.patch(f"/subscriptions/{sub_id}/toggle")
        nuovo = leggi_sub(db_session, sub_id)["next_date"]
        assert nuovo > date.today(), "senza questo si genererebbero subito arretrati"

    def test_in_pausa_non_genera_spese(self, client, db_session, utente, crea_abbonamento):
        """Un abbonamento sospeso non deve addebitare nulla."""
        crea_abbonamento(is_active=False, giorni_al_rinnovo=-90)
        client.get("/expenses/")
        assert conta_spese(db_session, utente) == 0

    def test_abbonamento_altrui(self, client, db_session, make_user, login_as):
        altro_id = make_user(email="altro@example.com")
        db = db_session()
        sub = models.Subscriptions(
            description="Altrui", amount=5.0, frequency="monthly",
            next_date=date.today() + timedelta(days=10), user_id=altro_id,
        )
        db.add(sub)
        db.commit()
        db.refresh(sub)
        sub_id = sub.id
        db.close()

        login_as(make_user(email="io@example.com"))
        assert client.patch(f"/subscriptions/{sub_id}/toggle").status_code == 404

    def test_abbonamento_inesistente(self, client, utente):
        assert client.patch("/subscriptions/9999/toggle").status_code == 404


class TestHoRinnovato:
    """Per gli abbonamenti senza rinnovo automatico è l'utente a confermare il pagamento."""

    def test_crea_la_spesa(self, client, db_session, utente, crea_abbonamento):
        sub_id = crea_abbonamento(auto_renew=False, amount=9.99)
        prima = conta_spese(db_session, utente)
        r = client.post(f"/subscriptions/{sub_id}/mark-paid")
        assert r.status_code == 200
        assert conta_spese(db_session, utente) == prima + 1

    def test_la_spesa_ha_gli_stessi_dati_dell_abbonamento(self, client, db_session, utente, crea_abbonamento):
        sub_id = crea_abbonamento(auto_renew=False, amount=9.99)
        client.post(f"/subscriptions/{sub_id}/mark-paid")
        db = db_session()
        spesa = db.query(models.Expense).filter(models.Expense.user_id == utente).first()
        db.close()
        assert spesa.description == "Netflix"
        assert spesa.amount == 9.99

    def test_il_rinnovo_avanza(self, client, db_session, crea_abbonamento):
        sub_id = crea_abbonamento(auto_renew=False)
        prima = leggi_sub(db_session, sub_id)["next_date"]
        client.post(f"/subscriptions/{sub_id}/mark-paid")
        assert leggi_sub(db_session, sub_id)["next_date"] > prima

    def test_conferme_ripetute_creano_piu_spese(self, client, db_session, utente, crea_abbonamento):
        """Ogni conferma è un pagamento distinto: due conferme, due spese."""
        sub_id = crea_abbonamento(auto_renew=False)
        client.post(f"/subscriptions/{sub_id}/mark-paid")
        client.post(f"/subscriptions/{sub_id}/mark-paid")
        assert conta_spese(db_session, utente) == 2

    def test_abbonamento_altrui(self, client, db_session, make_user, login_as):
        altro_id = make_user(email="altro2@example.com")
        db = db_session()
        sub = models.Subscriptions(
            description="Altrui", amount=5.0, frequency="monthly",
            next_date=date.today() + timedelta(days=10), user_id=altro_id,
        )
        db.add(sub)
        db.commit()
        db.refresh(sub)
        sub_id = sub.id
        db.close()

        login_as(make_user(email="io2@example.com"))
        assert client.post(f"/subscriptions/{sub_id}/mark-paid").status_code == 404


class TestEliminazione:
    def test_elimina(self, client, db_session, crea_abbonamento):
        sub_id = crea_abbonamento()
        assert client.delete(f"/subscriptions/{sub_id}").status_code == 200
        assert leggi_sub(db_session, sub_id) is None

    def test_le_spese_gia_generate_restano(self, client, db_session, utente, crea_abbonamento):
        """Sono pagamenti realmente avvenuti: eliminarli falserebbe lo storico."""
        sub_id = crea_abbonamento(auto_renew=False)
        client.post(f"/subscriptions/{sub_id}/mark-paid")
        spese = conta_spese(db_session, utente)

        client.delete(f"/subscriptions/{sub_id}")
        assert conta_spese(db_session, utente) == spese

    def test_dopo_l_eliminazione_non_genera_piu_rinnovi(self, client, db_session, utente, crea_abbonamento):
        sub_id = crea_abbonamento(giorni_al_rinnovo=-90)
        client.delete(f"/subscriptions/{sub_id}")
        client.get("/expenses/")
        assert conta_spese(db_session, utente) == 0

    def test_abbonamento_altrui(self, client, db_session, make_user, login_as):
        altro_id = make_user(email="altro3@example.com")
        db = db_session()
        sub = models.Subscriptions(
            description="Altrui", amount=5.0, frequency="monthly",
            next_date=date.today() + timedelta(days=10), user_id=altro_id,
        )
        db.add(sub)
        db.commit()
        db.refresh(sub)
        sub_id = sub.id
        db.close()

        login_as(make_user(email="io3@example.com"))
        assert client.delete(f"/subscriptions/{sub_id}").status_code == 404
        assert leggi_sub(db_session, sub_id) is not None


class TestElencoAbbonamenti:
    def test_mostra_solo_i_propri(self, client, db_session, make_user, login_as):
        altro_id = make_user(email="altro4@example.com")
        db = db_session()
        db.add(models.Subscriptions(
            description="Altrui", amount=5.0, frequency="monthly",
            next_date=date.today() + timedelta(days=10), user_id=altro_id,
        ))
        db.commit()
        db.close()

        login_as(make_user(email="io4@example.com"))
        r = client.get("/subscriptions/")
        assert r.status_code == 200
        assert r.json() == []

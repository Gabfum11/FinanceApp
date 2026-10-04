"""Il giorno dell'utente, non quello del server.

Il caso reale: una spesa all'1 di notte del 1° ottobre in Italia. Il server, in
UTC, era ancora al 30 settembre: la spesa finiva in settembre ("ieri" in app) e
il budget mostrava il ciclo di settembre. Qui il server viene fermato proprio a
quell'istante.
"""
from datetime import date, datetime, timezone
from unittest.mock import patch

import pytest

from app import models
from app.business_logic import oggi as modulo_oggi
from app.business_logic.oggi import data_locale

#30 settembre 2026 alle 23 UTC = 1° ottobre all'1 di notte in Italia (ora legale)
ISTANTE = datetime(2026, 9, 30, 23, 0, tzinfo=timezone.utc)


class OrologioFermo(datetime):
    @classmethod
    def now(cls, tz=None):
        return ISTANTE.astimezone(tz) if tz else ISTANTE.replace(tzinfo=None)


@pytest.fixture
def mezzanotte_passata(monkeypatch):
    monkeypatch.setattr(modulo_oggi, "datetime", OrologioFermo)


@pytest.fixture
def utente(client, make_user, login_as):
    user_id = make_user(email="notte@t.it", monthly_budget=600)
    login_as(user_id)
    return user_id


def dal_telefono(giorno: str) -> dict:
    return {"X-Local-Date": giorno}


class TestDataLocale:
    def test_la_data_del_telefono_vale(self, mezzanotte_passata):
        assert data_locale("2026-10-01") == date(2026, 10, 1)

    def test_un_fuso_indietro_vale_anche_lui(self, mezzanotte_passata):
        #a Londra o a New York e' ancora il 30
        assert data_locale("2026-09-30") == date(2026, 9, 30)

    def test_una_data_lontana_non_e_credibile(self, mezzanotte_passata):
        #ricade sull'ora italiana, non sulla data falsa
        assert data_locale("2020-01-01") == date(2026, 10, 1)

    def test_una_data_illeggibile_ricade_sull_italia(self, mezzanotte_passata):
        assert data_locale("ieri") == date(2026, 10, 1)

    def test_senza_intestazione_vale_l_italia_e_non_l_utc(self, mezzanotte_passata):
        assert data_locale(None) == date(2026, 10, 1)


class TestUnaSpesaDopoMezzanotte:
    def test_il_budget_e_quello_del_mese_nuovo(self, client, mezzanotte_passata, utente):
        client.post("/expenses/", json={"description": "Taxi", "amount": 20, "date": "2026-10-01"},
                    headers=dal_telefono("2026-10-01"))
        stato = client.get("/budget/status", headers=dal_telefono("2026-10-01")).json()
        assert stato["cycle_start"] == "2026-10-01"
        assert stato["spent"] == 20

    def test_anche_senza_intestazione_il_mese_e_quello_italiano(self, client, mezzanotte_passata, utente):
        assert client.get("/budget/status").json()["cycle_start"] == "2026-10-01"

    def test_l_assistente_data_la_spesa_ad_oggi_dell_utente(self, client, mezzanotte_passata, utente):
        estratta = {"description": "Taxi", "amount": 20.0, "date": None, "category": None,
                    "recurring": False, "frequency": None, "currency": None}
        with patch("app.business_logic.categorization.extract_expense_from_text", return_value=estratta) as estrai:
            proposta = client.post("/expenses/extract-preview", json={"expenseText": "taxi 20"},
                                   headers=dal_telefono("2026-10-01")).json()
        assert proposta["date"] == "2026-10-01"
        #e "ieri" detto all'assistente si conta dal suo giorno
        assert estrai.call_args.kwargs["oggi"] == date(2026, 10, 1)

    def test_la_settimana_e_quella_dell_utente(self, client, mezzanotte_passata, utente):
        #il 1° ottobre 2026 e' un giovedi': la settimana parte lunedi' 28 settembre
        settimana = client.get("/expenses/weekly-stats", headers=dal_telefono("2026-10-01")).json()
        assert settimana["week_start"] == "2026-09-28"
        assert settimana["days"][3]["date"] == "2026-10-01"

    def test_un_rinnovo_di_oggi_si_registra_gia(self, client, db_session, mezzanotte_passata, utente):
        db = db_session()
        db.add(models.Subscriptions(description="Palestra", amount=40, frequency="monthly",
                                    next_date=date(2026, 10, 1), user_id=utente))
        db.commit()
        db.close()
        spese = client.get("/expenses/", headers=dal_telefono("2026-10-01")).json()
        assert [s["date"] for s in spese] == ["2026-10-01"]

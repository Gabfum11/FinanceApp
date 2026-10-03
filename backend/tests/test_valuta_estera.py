"""Spese e abbonamenti pagati in un'altra valuta.

amount resta nella valuta dell'utente, cosi' budget e statistiche sommano cifre
omogenee; la cifra vera e il tasso restano accanto. Il servizio dei tassi e'
sostituito da uno finto: i test non dipendono dalla rete.
"""
from datetime import date, timedelta

import pytest

from app import models
from app.business_logic import cambi


@pytest.fixture
def tassi(monkeypatch):
    """Servizio dei tassi finto: 1 GBP = 1.2, 1 USD = 0.9, salvo diversa indicazione per un giorno."""
    finto = {"chiamate": [], "giu": False, "per_giorno": {}}

    def chiedi(da, a, giorno):
        finto["chiamate"].append((da, a, giorno))
        if finto["giu"]:
            raise cambi.httpx.ConnectError("servizio irraggiungibile")
        valore = finto["per_giorno"].get(giorno) or {"GBP": 1.2, "USD": 0.9, "CHF": 1.05}[da]
        return valore, giorno

    monkeypatch.setattr(cambi, "_chiedi_tasso", chiedi)
    cambi._tassi.clear()
    yield finto
    cambi._tassi.clear()


@pytest.fixture
def utente(make_user, login_as):
    user_id = make_user(email="viaggio@t.it")
    login_as(user_id)
    return user_id


def spese_di(db_session, user_id):
    db = db_session()
    righe = db.query(models.Expense).filter(models.Expense.user_id == user_id).order_by(models.Expense.date).all()
    db.close()
    return righe


class TestSpesa:
    def test_convertita_nella_valuta_dell_utente(self, client, tassi, utente):
        r = client.post("/expenses/", json={"description": "Cena", "amount": 40, "date": "2026-10-01", "currency": "GBP"})
        assert r.status_code == 200
        dati = r.json()
        assert dati["amount"] == 48.0
        assert dati["original_amount"] == 40
        assert dati["original_currency"] == "GBP"
        assert dati["exchange_rate"] == 1.2

    def test_usa_il_tasso_del_giorno_della_spesa(self, client, tassi, utente):
        tassi["per_giorno"][date(2026, 3, 10)] = 1.15
        dati = client.post("/expenses/", json={"description": "Cena", "amount": 40, "date": "2026-03-10", "currency": "GBP"}).json()
        assert dati["amount"] == 46.0
        assert tassi["chiamate"][-1] == ("GBP", "EUR", date(2026, 3, 10))

    def test_nella_propria_valuta_resta_normale(self, client, tassi, utente):
        dati = client.post("/expenses/", json={"description": "Pizza", "amount": 15, "date": "2026-10-01", "currency": "EUR"}).json()
        assert dati["amount"] == 15
        assert dati["original_currency"] is None
        assert tassi["chiamate"] == []

    def test_senza_valuta_come_prima(self, client, tassi, utente):
        dati = client.post("/expenses/", json={"description": "Pizza", "amount": 15, "date": "2026-10-01"}).json()
        assert dati["amount"] == 15
        assert dati["original_amount"] is None

    def test_cifra_convertita_a_mano_non_chiede_il_tasso(self, client, tassi, utente):
        tassi["giu"] = True
        dati = client.post("/expenses/", json={"description": "Cena", "amount": 40, "date": "2026-10-01",
                                               "currency": "GBP", "converted_amount": 47.3}).json()
        assert dati["amount"] == 47.3
        assert dati["original_amount"] == 40
        assert dati["exchange_rate"] == pytest.approx(47.3 / 40)
        assert tassi["chiamate"] == []

    def test_servizio_giu_non_salva_niente(self, client, db_session, tassi, utente):
        tassi["giu"] = True
        r = client.post("/expenses/", json={"description": "Cena", "amount": 40, "date": "2026-10-01", "currency": "GBP"})
        assert r.status_code == 503
        assert r.json()["detail"] == "Exchange rate unavailable"
        assert spese_di(db_session, utente) == []

    def test_valuta_non_offerta_rifiutata(self, client, tassi, utente):
        r = client.post("/expenses/", json={"description": "Sushi", "amount": 40, "date": "2026-10-01", "currency": "JPY"})
        assert r.status_code == 422

    def test_il_tasso_si_chiede_una_volta_sola(self, client, tassi, utente):
        for _ in range(3):
            client.post("/expenses/", json={"description": "Tè", "amount": 4, "date": "2026-10-01", "currency": "GBP"})
        assert len(tassi["chiamate"]) == 1

    def test_il_budget_somma_le_cifre_convertite(self, client, db_session, tassi, utente):
        db = db_session()
        db.query(models.User).get(utente).monthly_budget = 500
        db.commit()
        db.close()
        client.post("/expenses/", json={"description": "Pizza", "amount": 15, "date": date.today().isoformat()})
        client.post("/expenses/", json={"description": "Cena", "amount": 40, "date": date.today().isoformat(), "currency": "GBP"})
        stato = client.get("/budget/status").json()
        assert stato["spent"] == 63.0
        assert stato["remaining"] == 437.0


class TestModificaSpesa:
    @pytest.fixture
    def cena(self, client, tassi, utente):
        return client.post("/expenses/", json={"description": "Cena", "amount": 40, "date": "2026-10-01", "currency": "GBP"}).json()["id"]

    def test_nuovo_importo_riconvertito(self, client, tassi, cena):
        dati = client.patch(f"/expenses/{cena}", json={"amount": 50}).json()
        assert dati["original_amount"] == 50
        assert dati["amount"] == 60.0

    def test_nuova_data_usa_il_suo_tasso(self, client, tassi, cena):
        tassi["per_giorno"][date(2026, 9, 1)] = 1.1
        dati = client.patch(f"/expenses/{cena}", json={"date": "2026-09-01"}).json()
        assert dati["amount"] == 44.0
        assert dati["original_amount"] == 40

    def test_solo_la_descrizione_non_riconverte(self, client, tassi, cena):
        chiamate = len(tassi["chiamate"])
        tassi["giu"] = True
        r = client.patch(f"/expenses/{cena}", json={"description": "Cena a Soho"})
        assert r.status_code == 200
        assert r.json()["amount"] == 48.0
        assert len(tassi["chiamate"]) == chiamate

    def test_tornare_alla_propria_valuta(self, client, tassi, cena):
        dati = client.patch(f"/expenses/{cena}", json={"currency": "EUR", "amount": 45}).json()
        assert dati["amount"] == 45
        assert dati["original_currency"] is None
        assert dati["exchange_rate"] is None

    def test_spesa_normale_diventa_estera(self, client, tassi, utente):
        spesa = client.post("/expenses/", json={"description": "Taxi", "amount": 20, "date": "2026-10-01"}).json()["id"]
        dati = client.patch(f"/expenses/{spesa}", json={"currency": "USD"}).json()
        assert dati["original_amount"] == 20
        assert dati["amount"] == 18.0

    def test_servizio_giu_lascia_la_spesa_com_era(self, client, tassi, cena):
        tassi["giu"] = True
        cambi._tassi.clear()
        r = client.patch(f"/expenses/{cena}", json={"amount": 50})
        assert r.status_code == 503
        tassi["giu"] = False
        dati = client.get(f"/expenses/{cena}").json()
        assert dati["amount"] == 48.0


class TestAbbonamento:
    def test_rinnovi_arretrati_ognuno_con_il_suo_tasso(self, client, db_session, tassi, utente):
        oggi = date.today()
        partenza = oggi - timedelta(days=40)
        tassi["per_giorno"][partenza] = 0.8
        r = client.post("/subscriptions/", json={"description": "Servizio", "amount": 10, "frequency": "monthly",
                                                  "currency": "USD", "start_date": partenza.isoformat()})
        assert r.status_code == 200
        assert r.json()["currency"] == "USD"
        assert r.json()["amount"] == 10
        spese = spese_di(db_session, utente)
        assert len(spese) == 2
        assert spese[0].amount == 8.0
        assert spese[1].amount == 9.0
        assert all(s.original_amount == 10 and s.original_currency == "USD" for s in spese)

    def test_nella_propria_valuta_si_salva_vuota(self, client, tassi, utente):
        dati = client.post("/subscriptions/", json={"description": "Palestra", "amount": 40,
                                                     "frequency": "monthly", "currency": "EUR"}).json()
        assert dati["currency"] is None

    def test_rinnovo_automatico_convertito(self, client, db_session, tassi, utente):
        db = db_session()
        db.add(models.Subscriptions(description="Servizio", amount=10, frequency="monthly", currency="USD",
                                    next_date=date.today(), user_id=utente))
        db.commit()
        db.close()
        client.get("/expenses/")
        spesa = spese_di(db_session, utente)[0]
        assert spesa.amount == 9.0
        assert spesa.original_currency == "USD"

    def test_rinnovo_rimandato_se_il_servizio_e_giu(self, client, db_session, tassi, utente):
        db = db_session()
        sub = models.Subscriptions(description="Servizio", amount=10, frequency="monthly", currency="USD",
                                   next_date=date.today(), user_id=utente)
        db.add(sub)
        db.commit()
        sub_id = sub.id
        db.close()
        tassi["giu"] = True
        assert client.get("/expenses/").status_code == 200
        assert spese_di(db_session, utente) == []
        db = db_session()
        assert db.query(models.Subscriptions).get(sub_id).next_date == date.today()
        db.close()
        #il servizio torna: il rinnovo si registra con il giorno giusto
        tassi["giu"] = False
        client.get("/expenses/")
        assert spese_di(db_session, utente)[0].date == date.today()

    def test_rinnovo_manuale_convertito(self, client, db_session, tassi, utente):
        sub = client.post("/subscriptions/", json={"description": "Servizio", "amount": 10, "frequency": "monthly",
                                                    "currency": "USD", "auto_renew": False,
                                                    "start_date": (date.today() + timedelta(days=3)).isoformat()}).json()
        assert client.post(f"/subscriptions/{sub['id']}/mark-paid").status_code == 200
        assert spese_di(db_session, utente)[0].amount == 9.0

    def test_cambio_valuta_dell_abbonamento(self, client, tassi, utente):
        sub = client.post("/subscriptions/", json={"description": "Servizio", "amount": 10, "frequency": "monthly",
                                                    "start_date": (date.today() + timedelta(days=3)).isoformat()}).json()
        assert client.patch(f"/subscriptions/{sub['id']}", json={"currency": "GBP"}).json()["currency"] == "GBP"
        assert client.patch(f"/subscriptions/{sub['id']}", json={"currency": "EUR"}).json()["currency"] is None


class TestTassoPerAnteprima:
    def test_restituisce_tasso_e_giorno(self, client, tassi, utente):
        r = client.get("/exchange-rate", params={"from_currency": "GBP", "day": "2026-10-01"})
        assert r.status_code == 200
        assert r.json() == {"from_currency": "GBP", "to_currency": "EUR", "rate": 1.2, "date": "2026-10-01"}

    def test_servizio_giu(self, client, tassi, utente):
        tassi["giu"] = True
        assert client.get("/exchange-rate", params={"from_currency": "GBP"}).status_code == 503

    def test_valuta_non_offerta(self, client, tassi, utente):
        assert client.get("/exchange-rate", params={"from_currency": "JPY"}).status_code == 422

    def test_serve_essere_autenticati(self, client, tassi):
        assert client.get("/exchange-rate", params={"from_currency": "GBP"}).status_code == 401

    def test_data_futura_usa_l_ultimo_tasso(self, client, tassi, utente):
        domani = date.today() + timedelta(days=1)
        client.get("/exchange-rate", params={"from_currency": "GBP", "day": domani.isoformat()})
        assert tassi["chiamate"][-1][2] == date.today()


class TestAssistente:
    def _estrai(self, client, valuta):
        from unittest.mock import patch
        risultato = {"description": "Cena", "amount": 40.0, "date": None, "category": None,
                     "recurring": False, "frequency": None, "currency": valuta}
        with patch("app.business_logic.categorization.extract_expense_from_text", return_value=risultato):
            return client.post("/expenses/extract-preview", json={"expenseText": "cena 40 sterline"}).json()

    def test_valuta_estera_arriva_all_app(self, client, utente):
        assert self._estrai(client, "GBP")["currency"] == "GBP"

    def test_la_propria_valuta_resta_una_spesa_normale(self, client, utente):
        assert self._estrai(client, "EUR")["currency"] is None

    def test_nessuna_valuta(self, client, utente):
        assert self._estrai(client, None)["currency"] is None

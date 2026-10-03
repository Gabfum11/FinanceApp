"""Cambio della valuta dell'account, convertendo anche le spese passate.

Ogni spesa si converte con il tasso del suo giorno partendo dalla cifra vera,
quindi cambiare valuta e tornare indietro riporta le cifre di partenza. Se un
tasso manca non cambia niente. Il servizio dei tassi e' finto.
"""
from datetime import date, timedelta

import pytest

from app import models
from app.business_logic import cambi

#tassi fissi verso ogni valuta: 1 EUR = 1.1 USD, 1 GBP = 1.2 EUR...
TASSI = {
    ("EUR", "USD"): 1.1, ("USD", "EUR"): 1 / 1.1,
    ("GBP", "USD"): 1.3, ("GBP", "EUR"): 1.2,
    ("EUR", "CHF"): 0.95, ("USD", "CHF"): 0.85,
}


@pytest.fixture
def tassi(monkeypatch):
    finto = {"periodi": [], "giu": False, "solo_feriali": False}

    def periodo(da, a, inizio, fine):
        finto["periodi"].append((da, a, inizio, fine))
        if finto["giu"]:
            raise cambi.httpx.ConnectError("irraggiungibile")
        giorni = {}
        g = inizio - timedelta(days=3) if finto["solo_feriali"] else inizio
        while g <= fine:
            if not finto["solo_feriali"] or g.weekday() < 5:
                #il tasso cambia ogni giorno: cosi' si vede quale giorno e' stato usato
                giorni[g] = TASSI[(da, a)] + (g.day / 1000 if finto["solo_feriali"] else 0)
            g += timedelta(days=1)
        return giorni

    def singolo(da, a, giorno):
        if finto["giu"]:
            raise cambi.httpx.ConnectError("irraggiungibile")
        return TASSI[(da, a)], giorno

    monkeypatch.setattr(cambi, "_chiedi_periodo", periodo)
    monkeypatch.setattr(cambi, "_chiedi_tasso", singolo)
    cambi._tassi.clear()
    yield finto
    cambi._tassi.clear()


@pytest.fixture
def utente(make_user, login_as):
    user_id = make_user(email="trasloco@t.it", monthly_budget=1000)
    login_as(user_id)
    return user_id


def spesa(client, descrizione, importo, giorno="2026-09-01", **extra):
    return client.post("/expenses/", json={"description": descrizione, "amount": importo, "date": giorno, **extra}).json()["id"]


def leggi_spesa(db_session, id_):
    db = db_session()
    riga = db.query(models.Expense).get(id_)
    db.close()
    return riga


def cambia(client, valuta, converti=True):
    return client.patch("/auth/preferences", json={"currency": valuta, "convert_history": converti})


class TestConversione:
    def test_spesa_nella_vecchia_valuta(self, client, db_session, tassi, utente):
        id_ = spesa(client, "Pizza", 10)
        assert cambia(client, "USD").status_code == 200
        riga = leggi_spesa(db_session, id_)
        assert riga.amount == 11.0
        assert riga.original_amount == 10
        assert riga.original_currency == "EUR"

    def test_spesa_estera_parte_dalla_sua_cifra_vera(self, client, db_session, tassi, utente):
        id_ = spesa(client, "Cena", 40, currency="GBP")
        cambia(client, "USD")
        riga = leggi_spesa(db_session, id_)
        assert riga.amount == 52.0
        assert riga.original_currency == "GBP"
        assert riga.original_amount == 40

    def test_spesa_gia_nella_nuova_valuta_torna_normale(self, client, db_session, tassi, utente):
        id_ = spesa(client, "Hotel", 100, currency="USD")
        cambia(client, "USD")
        riga = leggi_spesa(db_session, id_)
        assert riga.amount == 100
        assert riga.original_currency is None

    def test_andata_e_ritorno_ridanno_le_cifre_esatte(self, client, db_session, tassi, utente):
        id_ = spesa(client, "Spesa", 33.33)
        cambia(client, "USD")
        cambia(client, "EUR")
        riga = leggi_spesa(db_session, id_)
        assert riga.amount == 33.33
        assert riga.original_currency is None

    def test_il_budget_al_cambio_di_oggi(self, client, tassi, utente):
        cambia(client, "USD")
        assert client.get("/budget/status").json()["budget"] == 1100.0

    def test_abbonamenti_ricordano_il_loro_prezzo(self, client, tassi, utente):
        futuro = (date.today() + timedelta(days=5)).isoformat()
        palestra = client.post("/subscriptions/", json={"description": "Palestra", "amount": 40,
                                                         "frequency": "monthly", "start_date": futuro}).json()["id"]
        servizio = client.post("/subscriptions/", json={"description": "Servizio", "amount": 10, "currency": "USD",
                                                         "frequency": "monthly", "start_date": futuro}).json()["id"]
        cambia(client, "USD")
        abbonamenti = {s["id"]: s for s in client.get("/subscriptions/").json()}
        assert abbonamenti[palestra]["currency"] == "EUR"
        assert abbonamenti[palestra]["amount"] == 40
        assert abbonamenti[servizio]["currency"] is None

    def test_una_richiesta_per_valuta_di_partenza(self, client, tassi, utente):
        for i in range(20):
            spesa(client, f"Spesa {i}", 5, giorno=f"2026-08-{i + 1:02d}")
        spesa(client, "Cena", 40, currency="GBP")
        tassi["periodi"].clear()
        cambia(client, "USD")
        partenze = sorted(da for da, *_ in tassi["periodi"])
        assert partenze == ["EUR", "GBP"]

    def test_nel_fine_settimana_vale_l_ultimo_tasso_pubblicato(self, client, db_session, tassi, utente):
        tassi["solo_feriali"] = True
        #sabato 5 settembre 2026: vale il tasso di venerdi' 4
        id_ = spesa(client, "Mercato", 100, giorno="2026-09-05")
        cambia(client, "USD")
        assert leggi_spesa(db_session, id_).exchange_rate == pytest.approx(1.1 + 4 / 1000)


class TestServizioGiu:
    def test_non_cambia_niente(self, client, db_session, tassi, utente):
        id_ = spesa(client, "Pizza", 10)
        tassi["giu"] = True
        r = cambia(client, "USD")
        assert r.status_code == 503
        tassi["giu"] = False
        assert leggi_spesa(db_session, id_).amount == 10
        dati = client.get("/auth/me").json()
        assert dati["currency"] == "EUR"
        assert client.get("/budget/status").json()["budget"] == 1000


class TestSoloDaAdesso:
    def test_i_numeri_restano_gli_stessi(self, client, db_session, tassi, utente):
        id_ = spesa(client, "Pizza", 10)
        assert cambia(client, "USD", converti=False).status_code == 200
        riga = leggi_spesa(db_session, id_)
        assert riga.amount == 10
        assert riga.original_currency is None
        assert tassi["periodi"] == []
        assert client.get("/budget/status").json()["budget"] == 1000

    def test_abbonamento_nella_nuova_valuta_torna_normale(self, client, tassi, utente):
        futuro = (date.today() + timedelta(days=5)).isoformat()
        id_ = client.post("/subscriptions/", json={"description": "Servizio", "amount": 10, "currency": "USD",
                                                    "frequency": "monthly", "start_date": futuro}).json()["id"]
        cambia(client, "USD", converti=False)
        abbonamento = next(s for s in client.get("/subscriptions/").json() if s["id"] == id_)
        assert abbonamento["currency"] is None

    def test_stessa_valuta_non_fa_niente(self, client, tassi, utente):
        spesa(client, "Pizza", 10)
        tassi["periodi"].clear()
        assert cambia(client, "EUR").status_code == 200
        assert tassi["periodi"] == []

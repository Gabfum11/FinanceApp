"""Storico del budget: cambiarlo oggi non riscrive i mesi gia' chiusi.

Le statistiche di un mese passato mostrano l'avanzo rispetto al budget che
valeva allora, non a quello attuale.
"""
from datetime import timedelta

import pytest

from app import models
from app.business_logic import valuta_estera
from app.business_logic.budget import get_budget_cycle, budget_del_ciclo
from app.business_logic.oggi import oggi_in_italia


@pytest.fixture
def utente(make_user, login_as):
    user_id = make_user(email="storico@t.it")
    login_as(user_id)
    return user_id


def imposta(client, importo, giorno_inizio=1):
    risposta = client.patch("/auth/updateBudget", json={"monthly_budget": importo, "budget_start_day": giorno_inizio})
    assert risposta.status_code == 200


def budget_del_mese(client, offset):
    return client.get(f"/expenses/stats?cycle_offset={offset}").json()["budget"]


def righe(db_session, user_id):
    db = db_session()
    try:
        return db.query(models.BudgetHistory).filter(models.BudgetHistory.user_id == user_id).all()
    finally:
        db.close()


def aggiungi_riga(db_session, user_id, importo, valid_from):
    db = db_session()
    db.add(models.BudgetHistory(user_id=user_id, amount=importo, valid_from=valid_from))
    db.commit()
    db.close()


def test_cambiarlo_oggi_non_tocca_il_mese_passato(client, db_session, utente):
    #600 da tre mesi fa, poi oggi si passa a 800
    aggiungi_riga(db_session, utente, 600, oggi_in_italia() - timedelta(days=95))
    imposta(client, 800)
    assert budget_del_mese(client, -1) == 600


def test_vale_per_tutto_il_mese_in_corso(client, db_session, utente):
    #anche i giorni del ciclo gia' passati: si annota da oggi, ma il ciclo
    #in corso finisce dopo oggi, quindi lo usa per intero
    imposta(client, 500)
    _, fine = get_budget_cycle(oggi_in_italia(), 1)
    db = db_session()
    try:
        assert budget_del_ciclo(db, utente, fine) == 500
    finally:
        db.close()


def test_prima_del_primo_budget_non_ce_n_e_uno(client, utente):
    imposta(client, 500)
    assert budget_del_mese(client, -1) is None


def test_piu_cambi_nello_stesso_mese_lasciano_una_riga(client, db_session, utente):
    imposta(client, 500)
    imposta(client, 700)
    imposta(client, 650)
    storico = righe(db_session, utente)
    assert len(storico) == 1
    assert storico[0].amount == 650


def test_un_cambio_in_un_mese_nuovo_aggiunge_una_riga(client, db_session, utente):
    inizio, _ = get_budget_cycle(oggi_in_italia(), 1)
    aggiungi_riga(db_session, utente, 600, inizio - timedelta(days=40))
    imposta(client, 800)
    assert sorted(r.amount for r in righe(db_session, utente)) == [600, 800]


def test_il_cambio_di_valuta_converte_anche_lo_storico(db_session, utente, monkeypatch):
    aggiungi_riga(db_session, utente, 600, oggi_in_italia() - timedelta(days=95))
    #tasso finto: ogni importo raddoppia
    monkeypatch.setattr(valuta_estera, "precarica", lambda *a, **k: None)
    monkeypatch.setattr(valuta_estera, "converti", lambda importo, da, a, giorno: (importo * 2, 2.0, giorno))
    db = db_session()
    user = db.get(models.User, utente)
    valuta_estera.converti_storico(db, user, "USD")
    db.commit()
    db.close()
    assert [r.amount for r in righe(db_session, utente)] == [1200]


def test_cancellare_l_account_cancella_lo_storico(client, db_session, utente):
    imposta(client, 500)
    risposta = client.request("DELETE", "/auth/me", json={"password": "password123"})
    assert risposta.status_code == 200, risposta.text
    assert righe(db_session, utente) == []


def correggi(client, offset, importo):
    return client.patch("/budget/period", json={"cycle_offset": offset, "amount": importo})


def budget_del_periodo_in_corso(db_session, user_id):
    _, fine = get_budget_cycle(oggi_in_italia(), 1)
    db = db_session()
    try:
        return budget_del_ciclo(db, user_id, fine)
    finally:
        db.close()


def test_correggere_un_periodo_non_tocca_quello_dopo(client, db_session, utente):
    aggiungi_riga(db_session, utente, 600, oggi_in_italia() - timedelta(days=120))
    imposta(client, 800)
    assert correggi(client, -2, 500).status_code == 200
    assert budget_del_mese(client, -2) == 500
    #il periodo dopo ereditava da quello corretto: resta a 600
    assert budget_del_mese(client, -1) == 600
    assert budget_del_periodo_in_corso(db_session, utente) == 800


def test_correggere_il_periodo_prima_di_quello_in_corso(client, db_session, utente):
    aggiungi_riga(db_session, utente, 600, oggi_in_italia() - timedelta(days=120))
    imposta(client, 800)
    correggi(client, -1, 650)
    assert budget_del_mese(client, -1) == 650
    assert budget_del_periodo_in_corso(db_session, utente) == 800


def test_un_periodo_dopo_senza_budget_resta_senza(client, db_session, utente):
    #mai avuto un budget: correggere il mese scorso non ne da' uno a questo
    correggi(client, -1, 400)
    assert budget_del_mese(client, -1) == 400
    assert budget_del_periodo_in_corso(db_session, utente) is None


def test_correggere_due_volte_lo_stesso_periodo(client, db_session, utente):
    aggiungi_riga(db_session, utente, 600, oggi_in_italia() - timedelta(days=120))
    correggi(client, -2, 500)
    correggi(client, -2, 450)
    assert budget_del_mese(client, -2) == 450
    assert budget_del_mese(client, -1) == 600


def test_il_periodo_in_corso_vale_anche_dopo(client, db_session, utente):
    aggiungi_riga(db_session, utente, 600, oggi_in_italia() - timedelta(days=95))
    correggi(client, 0, 900)
    assert budget_del_periodo_in_corso(db_session, utente) == 900
    assert budget_del_mese(client, -1) == 600


@pytest.mark.parametrize("dati", [{"cycle_offset": 1, "amount": 500}, {"cycle_offset": -1, "amount": 0}, {"cycle_offset": -1, "amount": 2000000}])
def test_valori_non_ammessi(client, utente, dati):
    assert client.patch("/budget/period", json=dati).status_code == 422

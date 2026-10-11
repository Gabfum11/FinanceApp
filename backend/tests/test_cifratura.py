"""Cifratura delle colonne sensibili.

Chi apre il database (dashboard di Supabase, un backup) deve vedere testo
illeggibile; l'app, che ha la chiave, deve rileggere i valori di prima.
"""
from datetime import date

import pytest
from sqlalchemy import text

from app import models
from app.business_logic.cifratura import _valida_chiave


def _grezzo(sessione, query):
    return sessione.execute(text(query)).scalar()


def test_descrizioni_e_budget_illeggibili_nel_database(db_session):
    db = db_session()
    utente = models.User(email="a@b.it", monthly_budget=1234.5)
    db.add(utente)
    db.flush()
    db.add(models.Expense(description="Farmacia Rossi", descrizione_banca="PAG POS FARMACIA",
                          amount=12.5, date=date(2026, 10, 1), user_id=utente.id))
    db.add(models.BudgetHistory(user_id=utente.id, amount=800.25, valid_from=date(2026, 10, 1)))
    db.add(models.Subscriptions(description="Psicologo", amount=60, frequency="monthly",
                                next_date=date(2026, 11, 1), user_id=utente.id))
    db.commit()

    grezzi = [
        _grezzo(db, "SELECT description FROM expenses"),
        _grezzo(db, "SELECT descrizione_banca FROM expenses"),
        _grezzo(db, "SELECT description FROM subscriptions"),
        _grezzo(db, "SELECT monthly_budget FROM users"),
        _grezzo(db, "SELECT amount FROM budget_history"),
    ]
    for valore, in_chiaro in zip(grezzi, ["Farmacia", "FARMACIA", "Psicologo", "1234", "800"]):
        assert in_chiaro not in str(valore)

    db.expire_all()
    spesa = db.query(models.Expense).one()
    assert (spesa.description, spesa.descrizione_banca) == ("Farmacia Rossi", "PAG POS FARMACIA")
    assert db.query(models.Subscriptions).one().description == "Psicologo"
    assert db.query(models.User).one().monthly_budget == 1234.5
    assert db.query(models.BudgetHistory).one().amount == 800.25


def test_valori_vuoti_restano_vuoti(db_session):
    db = db_session()
    db.add(models.User(email="a@b.it"))
    db.commit()
    assert _grezzo(db, "SELECT monthly_budget FROM users") is None


@pytest.mark.parametrize("chiave", [None, "", "non-una-chiave-fernet"])
def test_chiave_mancante_o_sbagliata_blocca_l_avvio(chiave):
    with pytest.raises(RuntimeError) as e:
        _valida_chiave(chiave)
    assert "CHIAVE_CIFRATURA" in str(e.value)

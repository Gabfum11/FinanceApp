"""Spese generate da un abbonamento: restano collegate al loro abbonamento.

Rinominandolo, o cambiandone la categoria, si aggiornano anche le spese gia'
registrate. L'importo no: i mesi gia' pagati restano con la cifra di allora.
"""
from datetime import date, timedelta

import pytest

from app import models


@pytest.fixture
def utente(make_user, login_as):
    user_id = make_user(email="collegate@example.com", password="password123")
    login_as(user_id)
    return user_id


def crea_abbonamento(client, descrizione="Palestra", importo=40.0, **extra):
    """Un abbonamento partito due mesi fa: nascono subito le spese arretrate."""
    r = client.post("/subscriptions/", json={
        "description": descrizione,
        "amount": importo,
        "frequency": "monthly",
        "start_date": (date.today() - timedelta(days=60)).isoformat(),
        **extra,
    })
    assert r.status_code == 200, r.text
    return r.json()["id"]


def spese(db_session, user_id):
    db = db_session()
    try:
        return db.query(models.Expense).filter(models.Expense.user_id == user_id).all()
    finally:
        db.close()


def test_le_spese_dei_rinnovi_sono_collegate(client, db_session, utente):
    sub_id = crea_abbonamento(client)
    generate = spese(db_session, utente)
    assert len(generate) >= 2
    assert all(s.subscription_id == sub_id for s in generate)


def test_rinominare_aggiorna_le_spese_collegate(client, db_session, utente):
    sub_id = crea_abbonamento(client)
    r = client.patch(f"/subscriptions/{sub_id}", json={"description": "Palestra Rossi"})
    assert r.status_code == 200, r.text
    assert {s.description for s in spese(db_session, utente)} == {"Palestra Rossi"}


def test_una_spesa_a_mano_con_lo_stesso_nome_non_cambia(client, db_session, utente):
    """Il collegamento e' l'abbonamento, non il nome: una spesa a mano resta com'e'."""
    sub_id = crea_abbonamento(client)
    client.post("/expenses/", json={"description": "Palestra", "amount": 15, "date": date.today().isoformat()})
    client.patch(f"/subscriptions/{sub_id}", json={"description": "Palestra Rossi"})
    a_mano = [s for s in spese(db_session, utente) if s.subscription_id is None]
    assert [s.description for s in a_mano] == ["Palestra"]


def test_cambiare_categoria_aggiorna_le_spese(client, db_session, utente, make_category):
    sport = make_category(name="Sport")
    sub_id = crea_abbonamento(client)
    client.patch(f"/subscriptions/{sub_id}", json={"category_id": sport})
    assert {s.category_id for s in spese(db_session, utente)} == {sport}


def test_l_importo_non_cambia_le_spese_passate(client, db_session, utente):
    sub_id = crea_abbonamento(client, importo=40.0)
    client.patch(f"/subscriptions/{sub_id}", json={"amount": 45.0})
    assert {s.amount for s in spese(db_session, utente)} == {40.0}


def test_eliminare_l_abbonamento_lascia_le_spese(client, db_session, utente):
    sub_id = crea_abbonamento(client)
    prima = len(spese(db_session, utente))
    assert client.delete(f"/subscriptions/{sub_id}").status_code == 200
    rimaste = spese(db_session, utente)
    assert len(rimaste) == prima
    assert all(s.subscription_id is None for s in rimaste)


def test_le_spese_di_un_altro_utente_non_cambiano(client, db_session, utente, make_user, login_as):
    sub_id = crea_abbonamento(client)
    altro = make_user(email="altro@example.com", password="password123")
    login_as(altro)
    crea_abbonamento(client)
    login_as(utente)
    client.patch(f"/subscriptions/{sub_id}", json={"description": "Palestra Rossi"})
    assert {s.description for s in spese(db_session, altro)} == {"Palestra"}

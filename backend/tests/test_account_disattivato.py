"""Account disattivato (is_active = False): fuori subito e non puo' rientrare.

Prima un utente disattivato veniva buttato fuori solo al rinnovo della sessione,
e rientrava rifacendo il login con la password.
"""
from app import models
from app.business_logic import security

EMAIL = "disattivato@example.com"
PASSWORD = "password123"


def disattiva(db_session, user_id):
    db = db_session()
    db.query(models.User).filter(models.User.id == user_id).update({"is_active": False})
    db.commit()
    db.close()


def test_il_login_con_password_e_rifiutato(client, db_session, make_user):
    disattiva(db_session, make_user(email=EMAIL, password=PASSWORD))
    r = client.post("/auth/login", json={"email": EMAIL, "password": PASSWORD})
    assert r.status_code == 403
    assert r.json()["detail"] == "User not active"


def test_con_la_password_sbagliata_non_si_scopre_che_e_disattivato(client, db_session, make_user):
    """Chi non conosce la password riceve il solito 401, non "disattivato"."""
    disattiva(db_session, make_user(email=EMAIL, password=PASSWORD))
    r = client.post("/auth/login", json={"email": EMAIL, "password": "sbagliata1"})
    assert r.status_code == 401


def test_anche_il_login_di_swagger_e_rifiutato(client, db_session, make_user):
    disattiva(db_session, make_user(email=EMAIL, password=PASSWORD))
    r = client.post("/auth/token", data={"username": EMAIL, "password": PASSWORD})
    assert r.status_code == 403


def test_il_token_gia_emesso_smette_di_valere_subito(client, db_session, make_user):
    """Non si aspetta la scadenza dei 15 minuti: la richiesta dopo e' gia' rifiutata."""
    user_id = make_user(email=EMAIL, password=PASSWORD)
    token = client.post("/auth/login", json={"email": EMAIL, "password": PASSWORD}).json()["access_token"]
    intestazione = {"Authorization": f"Bearer {token}"}
    assert client.get("/auth/me", headers=intestazione).status_code == 200

    disattiva(db_session, user_id)
    assert client.get("/auth/me", headers=intestazione).status_code == 401


def test_il_token_di_reset_password_e_rifiutato(client, db_session, make_user):
    user_id = make_user(email=EMAIL, password=PASSWORD)
    db = db_session()
    user = db.get(models.User, user_id)
    token = security.create_user_token(user, purpose="password_reset")
    db.close()
    disattiva(db_session, user_id)
    r = client.post(
        "/auth/resetPassword",
        json={"new_password": "nuovapassword1"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 401

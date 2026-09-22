"""Autenticazione: tentativi OTP, login, accesso con Google, eliminazione account.

Copre i tre difetti corretti in passato:
- il contatore dei tentativi OTP che non si incrementava mai
- /auth/token che saltava verifica email e rate limit
- verify_otp che leggeva un campo assente dallo schema
"""
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import pytest

from app import models
from app.business_logic import security
from app.routers.auth import MAX_OTP_ATTEMPTS

PASSWORD = "password123"


@pytest.fixture
def otp_user(db_session, make_user):
    """Utente non verificato con un codice OTP valido."""
    user_id = make_user(email="otp@example.com", password=PASSWORD, verified=False)
    db = db_session()
    db.add(
        models.OtpCode(
            user_id=user_id,
            code="123456",
            purpose="email_verification",
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
            attempts=0,
        )
    )
    db.commit()
    db.close()
    return user_id


def attempts_of(db_session, user_id):
    db = db_session()
    otp = db.query(models.OtpCode).filter(models.OtpCode.user_id == user_id).first()
    n = otp.attempts if otp else None
    db.close()
    return n


class TestTentativiOtp:
    def test_codice_errato_incrementa_il_contatore(self, client, db_session, otp_user):
        client.post(
            "/auth/verify-otp",
            json={"email": "otp@example.com", "code": "999999", "purpose": "email_verification"},
        )
        assert attempts_of(db_session, otp_user) == 1

    def test_il_limite_blocca_anche_il_codice_giusto(self, client, db_session, otp_user):
        for _ in range(MAX_OTP_ATTEMPTS):
            client.post(
                "/auth/verify-otp",
                json={"email": "otp@example.com", "code": "000000", "purpose": "email_verification"},
            )
        # il codice corretto non basta più
        r = client.post(
            "/auth/verify-otp",
            json={"email": "otp@example.com", "code": "123456", "purpose": "email_verification"},
        )
        assert r.status_code == 401
        assert r.json()["detail"] == "Too many attempts"

    def test_codice_corretto_verifica_utente_e_cancella_otp(self, client, db_session, otp_user):
        r = client.post(
            "/auth/verify-otp",
            json={"email": "otp@example.com", "code": "123456", "purpose": "email_verification"},
        )
        assert r.status_code == 200
        assert "access_token" in r.json()

        db = db_session()
        user = db.query(models.User).filter(models.User.id == otp_user).first()
        rimasti = db.query(models.OtpCode).filter(models.OtpCode.user_id == otp_user).count()
        db.close()
        assert user.is_verified is True
        assert rimasti == 0

    def test_codice_scaduto(self, client, db_session, make_user):
        user_id = make_user(email="scaduto@example.com", password=PASSWORD, verified=False)
        db = db_session()
        db.add(
            models.OtpCode(
                user_id=user_id,
                code="123456",
                purpose="email_verification",
                expires_at=datetime.now(timezone.utc) - timedelta(minutes=1),
                attempts=0,
            )
        )
        db.commit()
        db.close()
        r = client.post(
            "/auth/verify-otp",
            json={"email": "scaduto@example.com", "code": "123456", "purpose": "email_verification"},
        )
        assert r.status_code == 401
        assert r.json()["detail"] == "code Expired"

    def test_email_sconosciuta(self, client, db_session):
        r = client.post(
            "/auth/verify-otp",
            json={"email": "nessuno@example.com", "code": "123456", "purpose": "email_verification"},
        )
        assert r.status_code == 401


class TestLogin:
    """/auth/login e /auth/token devono applicare gli stessi controlli."""

    @pytest.fixture(autouse=True)
    def utenti(self, make_user):
        make_user(email="ok@example.com", password=PASSWORD, verified=True)
        make_user(email="no@example.com", password=PASSWORD, verified=False)

    def test_login_utente_verificato(self, client):
        r = client.post("/auth/login", json={"email": "ok@example.com", "password": PASSWORD})
        assert r.status_code == 200

    def test_login_utente_non_verificato(self, client):
        r = client.post("/auth/login", json={"email": "no@example.com", "password": PASSWORD})
        assert r.status_code == 403

    def test_token_rifiuta_utente_non_verificato_come_login(self, client):
        """Senza questo controllo /auth/token sarebbe una porta laterale."""
        r = client.post("/auth/token", data={"username": "no@example.com", "password": PASSWORD})
        assert r.status_code == 403

    def test_token_accetta_utente_verificato(self, client):
        r = client.post("/auth/token", data={"username": "ok@example.com", "password": PASSWORD})
        assert r.status_code == 200

    def test_password_errata(self, client):
        r = client.post("/auth/login", json={"email": "ok@example.com", "password": "sbagliata"})
        assert r.status_code == 401


def google_response(email, sub, aud="client-test.apps.googleusercontent.com", **overrides):
    payload = {
        "email": email,
        "sub": sub,
        "aud": aud,
        "iss": "accounts.google.com",
        "email_verified": True,
        "name": "Mario Rossi",
    }
    payload.update(overrides)

    class FakeResponse:
        status_code = overrides.pop("status", 200)

        def json(self):
            return payload

    return FakeResponse()


@pytest.fixture
def google_configurato():
    import app.business_logic.google_auth as ga

    originale = ga.GOOGLE_CLIENT_IDS
    ga.GOOGLE_CLIENT_IDS = ["client-test.apps.googleusercontent.com"]
    yield
    ga.GOOGLE_CLIENT_IDS = originale


class TestGoogle:
    def test_nuovo_utente_viene_creato_gia_verificato(self, client, db_session, google_configurato):
        with patch("httpx.get", return_value=google_response("nuovo@gmail.com", "g-1")):
            r = client.post("/auth/google", json={"id_token": "finto"})
        assert r.status_code == 200

        db = db_session()
        user = db.query(models.User).filter(models.User.email == "nuovo@gmail.com").first()
        db.close()
        assert user.google_id == "g-1"
        assert user.is_verified is True
        assert user.hashed_password is None

    def test_account_esistente_viene_collegato(self, client, db_session, make_user, google_configurato):
        user_id = make_user(email="esiste@gmail.com", password=PASSWORD, nickname="Originale")
        with patch("httpx.get", return_value=google_response("esiste@gmail.com", "g-2")):
            r = client.post("/auth/google", json={"id_token": "finto"})
        assert r.status_code == 200

        db = db_session()
        user = db.query(models.User).filter(models.User.email == "esiste@gmail.com").first()
        db.close()
        assert user.id == user_id, "deve restare lo stesso account, non crearne uno nuovo"
        assert user.google_id == "g-2"
        assert user.hashed_password is not None, "la password non va persa"
        assert user.nickname == "Originale", "il nickname non va sovrascritto"

    def test_token_di_un_altra_app_rifiutato(self, client, google_configurato):
        with patch("httpx.get", return_value=google_response("x@gmail.com", "g-9", aud="altra-app")):
            r = client.post("/auth/google", json={"id_token": "finto"})
        assert r.status_code == 401

    def test_email_non_verificata_rifiutata(self, client, google_configurato):
        with patch("httpx.get", return_value=google_response("x@gmail.com", "g-9", email_verified=False)):
            r = client.post("/auth/google", json={"id_token": "finto"})
        assert r.status_code == 401


class TestEliminazioneAccount:
    def test_cancella_utente_e_tutti_i_suoi_dati(self, client, db_session, make_user, login_as):
        from datetime import date

        user_id = make_user(email="addio@example.com", password=PASSWORD)
        db = db_session()
        db.add(models.Expense(description="Spesa", amount=10.0, date=date.today(), user_id=user_id))
        db.add(
            models.Subscriptions(
                description="Abb", amount=5.0, frequency="monthly",
                next_date=date.today() + timedelta(days=30), user_id=user_id,
            )
        )
        db.commit()
        db.close()

        login_as(user_id)
        r = client.request("DELETE", "/auth/me", json={"password": PASSWORD})
        assert r.status_code == 200

        db = db_session()
        assert db.query(models.User).filter(models.User.id == user_id).count() == 0
        assert db.query(models.Expense).filter(models.Expense.user_id == user_id).count() == 0
        assert db.query(models.Subscriptions).filter(models.Subscriptions.user_id == user_id).count() == 0
        db.close()

    def test_password_errata_non_cancella_nulla(self, client, db_session, make_user, login_as):
        user_id = make_user(email="resta@example.com", password=PASSWORD)
        login_as(user_id)
        r = client.request("DELETE", "/auth/me", json={"password": "sbagliata"})
        assert r.status_code == 401

        db = db_session()
        assert db.query(models.User).filter(models.User.id == user_id).count() == 1
        db.close()

    def test_utente_google_puo_cancellarsi_senza_password(self, client, db_session, make_user, login_as):
        """Le policy degli store richiedono che l'eliminazione sia sempre possibile."""
        user_id = make_user(email="google@example.com", password=None, google_id="g-99")
        login_as(user_id)
        r = client.request("DELETE", "/auth/me", json={"password": ""})
        assert r.status_code == 200

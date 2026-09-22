"""Token di accesso e controllo delle autorizzazioni.

Il punto più delicato è la separazione tra i due tipi di token: quello di reset
password non deve valere come login, altrimenti chi riceve un codice via email
otterrebbe accesso completo all'account senza conoscere la password.
"""
from datetime import datetime, timedelta, timezone

import pytest
from jose import jwt

from app import models
from app.business_logic import security


class TestPassword:
    def test_hash_diverso_dalla_password(self):
        h = security.hash_password("password123")
        assert h != "password123"
        assert len(h) > 20

    def test_verifica_password_corretta(self):
        h = security.hash_password("password123")
        assert security.verify_password("password123", h) is True

    def test_verifica_password_errata(self):
        h = security.hash_password("password123")
        assert security.verify_password("sbagliata", h) is False

    def test_due_hash_della_stessa_password_sono_diversi(self):
        """Il salt impedisce di riconoscere utenti con la stessa password."""
        assert security.hash_password("uguale") != security.hash_password("uguale")

    def test_password_nulla_non_solleva_eccezioni(self):
        """Gli utenti che accedono solo con Google non hanno una password salvata."""
        assert security.verify_password("qualsiasi", None) is False


class TestToken:
    def test_token_contiene_i_dati_passati(self):
        token = security.create_access_token({"sub": "42"})
        payload = security.decode_access_token(token)
        assert payload["sub"] == "42"

    def test_token_contiene_la_scadenza(self):
        token = security.create_access_token({"sub": "42"})
        payload = security.decode_access_token(token)
        assert "exp" in payload

    def test_scadenza_personalizzata(self):
        token = security.create_access_token({"sub": "42"}, expire_minutes=60 * 24 * 30)
        payload = security.decode_access_token(token)
        scadenza = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
        assert scadenza > datetime.now(timezone.utc) + timedelta(days=29)

    def test_token_scaduto_rifiutato(self):
        token = security.create_access_token({"sub": "42"}, expire_minutes=-1)
        assert security.decode_access_token(token) is None

    def test_token_malformato_rifiutato(self):
        assert security.decode_access_token("non-e-un-token") is None
        assert security.decode_access_token("") is None

    def test_token_firmato_con_altra_chiave_rifiutato(self):
        """Senza questo controllo chiunque potrebbe fabbricare token validi."""
        falso = jwt.encode(
            {"sub": "42", "exp": datetime.now(timezone.utc) + timedelta(hours=1)},
            "chiave-di-un-altro",
            algorithm="HS256",
        )
        assert security.decode_access_token(falso) is None

    def test_token_manomesso_rifiutato(self):
        token = security.create_access_token({"sub": "42"})
        # cambio un carattere nella firma
        manomesso = token[:-3] + ("aaa" if not token.endswith("aaa") else "bbb")
        assert security.decode_access_token(manomesso) is None


class TestGetCurrentUser:
    """get_current_user è il guardiano di ogni endpoint autenticato."""

    def _call(self, db_session, token):
        db = db_session()
        try:
            return security.get_current_user(token=token, db=db)
        finally:
            db.close()

    def test_token_valido_restituisce_utente(self, db_session, make_user):
        user_id = make_user(email="valido@example.com")
        token = security.create_access_token({"sub": str(user_id)})
        assert self._call(db_session, token).id == user_id

    def test_token_scaduto(self, db_session, make_user):
        user_id = make_user(email="scaduto@example.com")
        token = security.create_access_token({"sub": str(user_id)}, expire_minutes=-1)
        with pytest.raises(Exception) as e:
            self._call(db_session, token)
        assert e.value.status_code == 401

    def test_utente_cancellato(self, db_session, make_user):
        """Il token resta valido fino a scadenza anche se l'account non esiste più."""
        user_id = make_user(email="cancellato@example.com")
        token = security.create_access_token({"sub": str(user_id)})
        db = db_session()
        db.query(models.User).filter(models.User.id == user_id).delete()
        db.commit()
        db.close()
        with pytest.raises(Exception) as e:
            self._call(db_session, token)
        assert e.value.status_code == 401

    def test_token_senza_sub(self, db_session):
        token = security.create_access_token({"qualcosa": "altro"})
        with pytest.raises(Exception) as e:
            self._call(db_session, token)
        assert e.value.status_code == 401

    def test_token_di_reset_non_vale_come_login(self, db_session, make_user):
        """Separazione di privilegi: il token di reset dà solo il cambio password."""
        user_id = make_user(email="reset@example.com")
        token = security.create_access_token({"sub": str(user_id), "purpose": "password_reset"})
        with pytest.raises(Exception) as e:
            self._call(db_session, token)
        assert e.value.status_code == 401


class TestGetResetPasswordUser:
    def _call(self, db_session, token):
        db = db_session()
        try:
            return security.get_reset_password_user(token=token, db=db)
        finally:
            db.close()

    def test_token_di_reset_accettato(self, db_session, make_user):
        user_id = make_user(email="r@example.com")
        token = security.create_access_token({"sub": str(user_id), "purpose": "password_reset"})
        assert self._call(db_session, token).id == user_id

    def test_token_di_login_non_vale_per_il_reset(self, db_session, make_user):
        """L'inverso del test precedente: i due tipi non sono intercambiabili."""
        user_id = make_user(email="r2@example.com")
        token = security.create_access_token({"sub": str(user_id)})
        with pytest.raises(Exception) as e:
            self._call(db_session, token)
        assert e.value.status_code == 401

    def test_purpose_diverso_rifiutato(self, db_session, make_user):
        user_id = make_user(email="r3@example.com")
        token = security.create_access_token({"sub": str(user_id), "purpose": "altro"})
        with pytest.raises(Exception) as e:
            self._call(db_session, token)
        assert e.value.status_code == 401


class TestGetCurrentAdmin:
    def test_utente_normale_rifiutato(self, db_session, make_user):
        user_id = make_user(email="normale@example.com")
        db = db_session()
        user = db.query(models.User).filter(models.User.id == user_id).first()
        with pytest.raises(Exception) as e:
            security.get_current_admin(current_user=user)
        db.close()
        assert e.value.status_code == 403

    def test_admin_accettato(self, db_session, make_user):
        user_id = make_user(email="admin@example.com", is_admin=True)
        db = db_session()
        user = db.query(models.User).filter(models.User.id == user_id).first()
        assert security.get_current_admin(current_user=user).id == user_id
        db.close()

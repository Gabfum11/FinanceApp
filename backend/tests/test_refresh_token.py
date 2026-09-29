"""Refresh token: emissione, rotazione, revoca.

Il punto delicato è la rotazione: un token già consumato che torna indietro
è la prova che qualcuno ne ha una copia, e deve chiudere ogni sessione.
"""
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException

from app import models
from app.business_logic import security


@pytest.fixture
def db(db_session):
    session = db_session()
    yield session
    session.close()


def _user(db, user_id):
    return db.query(models.User).filter(models.User.id == user_id).first()


class TestCreazione:
    def test_nel_database_finisce_solo_l_hash(self, db, make_user):
        user = _user(db, make_user())
        token = security.create_refresh_token(db, user)

        riga = db.query(models.RefreshToken).one()
        assert riga.token_hash != token
        assert riga.token_hash == security._hash_refresh_token(token)
        assert riga.used_at is None

    def test_scade_dopo_trenta_giorni(self, db, make_user):
        user = _user(db, make_user())
        security.create_refresh_token(db, user)

        riga = db.query(models.RefreshToken).one()
        attesa = datetime.now(timezone.utc) + timedelta(days=security.REFRESH_TOKEN_DAYS)
        assert abs(riga.expires_at - attesa) < timedelta(minutes=1)

    def test_cancella_le_righe_scadute_dell_utente(self, db, make_user):
        """Ogni rinnovo lascia una riga: senza pulizia la tabella crescerebbe sempre."""
        user_id = make_user()
        altro_id = make_user("altro@example.com")
        security.create_refresh_token(db, _user(db, user_id))
        security.create_refresh_token(db, _user(db, altro_id))
        for riga in db.query(models.RefreshToken).all():
            riga.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
        db.commit()

        security.create_refresh_token(db, _user(db, user_id))

        mie = db.query(models.RefreshToken).filter(models.RefreshToken.user_id == user_id).count()
        altrui = db.query(models.RefreshToken).filter(models.RefreshToken.user_id == altro_id).count()
        assert mie == 1
        assert altrui == 1  #quelle degli altri utenti le pulisce il loro prossimo login

    def test_due_token_dello_stesso_utente_sono_diversi(self, db, make_user):
        user = _user(db, make_user())
        assert security.create_refresh_token(db, user) != security.create_refresh_token(db, user)


class TestRotazione:
    def test_restituisce_utente_e_token_nuovo(self, db, make_user):
        user_id = make_user()
        token = security.create_refresh_token(db, _user(db, user_id))

        utente, nuovo = security.rotate_refresh_token(db, token)

        assert utente.id == user_id
        assert nuovo != token
        assert db.query(models.RefreshToken).count() == 2

    def test_il_token_usato_resta_marcato(self, db, make_user):
        """Non va cancellato: serve a riconoscerlo se torna indietro."""
        token = security.create_refresh_token(db, _user(db, make_user()))
        security.rotate_refresh_token(db, token)

        vecchio = db.query(models.RefreshToken).filter(
            models.RefreshToken.token_hash == security._hash_refresh_token(token)
        ).one()
        assert vecchio.used_at is not None

    def test_il_token_nuovo_funziona(self, db, make_user):
        token = security.create_refresh_token(db, _user(db, make_user()))
        _, nuovo = security.rotate_refresh_token(db, token)
        _, terzo = security.rotate_refresh_token(db, nuovo)
        assert terzo not in (token, nuovo)

    def test_token_inesistente_rifiutato(self, db, make_user):
        with pytest.raises(HTTPException) as exc:
            security.rotate_refresh_token(db, "inventato")
        assert exc.value.status_code == 401

    def test_token_scaduto_rifiutato(self, db, make_user):
        token = security.create_refresh_token(db, _user(db, make_user()))
        riga = db.query(models.RefreshToken).one()
        riga.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
        db.commit()

        with pytest.raises(HTTPException) as exc:
            security.rotate_refresh_token(db, token)
        assert exc.value.status_code == 401

    def test_utente_disattivato_rifiutato(self, db, make_user):
        user_id = make_user()
        token = security.create_refresh_token(db, _user(db, user_id))
        _user(db, user_id).is_active = False
        db.commit()

        with pytest.raises(HTTPException):
            security.rotate_refresh_token(db, token)
        #il rifiuto non deve consumare il token
        assert db.query(models.RefreshToken).one().used_at is None


class TestRiuso:
    def test_token_riusato_rifiutato(self, db, make_user):
        token = security.create_refresh_token(db, _user(db, make_user()))
        security.rotate_refresh_token(db, token)

        with pytest.raises(HTTPException) as exc:
            security.rotate_refresh_token(db, token)
        assert exc.value.status_code == 401

    def test_riuso_revoca_tutti_i_refresh_token(self, db, make_user):
        """Anche quello appena emesso: potrebbe averlo ottenuto il ladro."""
        user_id = make_user()
        token = security.create_refresh_token(db, _user(db, user_id))
        _, nuovo = security.rotate_refresh_token(db, token)

        with pytest.raises(HTTPException):
            security.rotate_refresh_token(db, token)

        assert db.query(models.RefreshToken).count() == 0
        with pytest.raises(HTTPException):
            security.rotate_refresh_token(db, nuovo)

    def test_riuso_invalida_i_token_di_accesso(self, db, make_user):
        user_id = make_user()
        versione = _user(db, user_id).token_version
        token = security.create_refresh_token(db, _user(db, user_id))
        security.rotate_refresh_token(db, token)

        with pytest.raises(HTTPException):
            security.rotate_refresh_token(db, token)

        db.expire_all()
        assert _user(db, user_id).token_version == versione + 1

    def test_riuso_non_tocca_gli_altri_utenti(self, db, make_user):
        mio = security.create_refresh_token(db, _user(db, make_user("a@example.com")))
        altrui = security.create_refresh_token(db, _user(db, make_user("b@example.com")))
        security.rotate_refresh_token(db, mio)

        with pytest.raises(HTTPException):
            security.rotate_refresh_token(db, mio)

        security.rotate_refresh_token(db, altrui)


class TestRevoca:
    def test_revoca_singola(self, db, make_user):
        user = _user(db, make_user())
        questo = security.create_refresh_token(db, user)
        altro = security.create_refresh_token(db, user)

        security.revoke_refresh_token(db, questo)

        with pytest.raises(HTTPException):
            security.rotate_refresh_token(db, questo)
        security.rotate_refresh_token(db, altro)

    def test_revoca_totale(self, db, make_user):
        user_id = make_user()
        altro_id = make_user("altro@example.com")
        security.create_refresh_token(db, _user(db, user_id))
        security.create_refresh_token(db, _user(db, user_id))
        security.create_refresh_token(db, _user(db, altro_id))

        security.revoke_all_refresh_tokens(db, user_id)
        db.commit()

        rimasti = db.query(models.RefreshToken).all()
        assert [r.user_id for r in rimasti] == [altro_id]

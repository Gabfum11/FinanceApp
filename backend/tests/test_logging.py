"""Registrazione degli errori.

Il punto non è che i log esistano, ma che portino il contesto necessario a
capire cosa è successo — e che non contengano dati personali.
"""
import logging

import pytest

from app.logging_config import ContextFormatter, setup_logging


def formatta(record: logging.LogRecord) -> str:
    formatter = ContextFormatter(fmt="%(levelname)s %(message)s")
    return formatter.format(record)


def crea_record(messaggio="test", livello=logging.WARNING, **contesto):
    record = logging.LogRecord(
        name="test", level=livello, pathname="x.py", lineno=1,
        msg=messaggio, args=(), exc_info=None,
    )
    for chiave, valore in contesto.items():
        setattr(record, chiave, valore)
    return record


class TestFormato:
    def test_messaggio_semplice(self):
        assert formatta(crea_record("qualcosa")) == "WARNING qualcosa"

    def test_il_contesto_viene_accodato(self):
        """Senza questo, extra={...} andrebbe perso e resterebbe solo il messaggio."""
        out = formatta(crea_record("fallita", user_id=42))
        assert "user_id=42" in out

    def test_piu_valori_di_contesto(self):
        out = formatta(crea_record("rifiutata", metodo="POST", percorso="/auth/login", stato=401))
        assert "metodo=POST" in out
        assert "percorso=/auth/login" in out
        assert "stato=401" in out

    def test_i_campi_interni_non_finiscono_nella_riga(self):
        out = formatta(crea_record("test"))
        for rumore in ["pathname", "lineno", "levelno", "msecs"]:
            assert rumore not in out


class TestRichiesteFallite:
    """Il middleware deve registrare gli esiti negativi di qualsiasi endpoint."""

    def test_richiesta_rifiutata_registrata_come_warning(self, client, caplog):
        with caplog.at_level(logging.WARNING):
            r = client.post("/auth/login", json={"email": "nessuno@x.it", "password": "x"})
        assert r.status_code == 401
        assert any("richiesta rifiutata" in m for m in caplog.messages)

    def test_il_log_dice_quale_endpoint(self, client, caplog):
        with caplog.at_level(logging.WARNING):
            client.post("/auth/login", json={"email": "nessuno@x.it", "password": "x"})
        record = next(r for r in caplog.records if "rifiutata" in r.message)
        assert record.percorso == "/auth/login"
        assert record.metodo == "POST"
        assert record.stato == 401

    def test_le_richieste_riuscite_non_vengono_registrate(self, client, caplog):
        """Loggare anche i successi riempirebbe i log di rumore."""
        with caplog.at_level(logging.WARNING):
            r = client.get("/health")
        assert r.status_code == 200
        assert not any("richiesta" in m for m in caplog.messages)

    def test_il_corpo_della_richiesta_non_viene_registrato(self, client, caplog):
        """Contiene password: non deve mai finire nei log."""
        with caplog.at_level(logging.WARNING):
            client.post("/auth/login", json={"email": "tizio@x.it", "password": "segretissima"})
        assert not any("segretissima" in m for m in caplog.messages)
        for record in caplog.records:
            assert "segretissima" not in str(record.__dict__)


class TestDatiPersonali:
    def test_l_invio_otp_fallito_registra_l_id_non_l_email(self, client, caplog, make_user):
        """L'email è un dato personale e i log restano leggibili per giorni."""
        from unittest.mock import patch

        user_id = make_user(email="privato@example.com", password="password123")
        with caplog.at_level(logging.ERROR):
            with patch(
                "app.business_logic.email_service.send_otp_email",
                side_effect=Exception("SMTP non raggiungibile"),
            ):
                client.post(
                    "/auth/resendOTP",
                    json={"email": "privato@example.com", "purpose": "email_verification"},
                )

        registrati = [r for r in caplog.records if "OTP" in r.message]
        assert registrati, "il fallimento dell'invio deve lasciare traccia"
        for record in registrati:
            assert "privato@example.com" not in str(record.__dict__)
            assert getattr(record, "user_id", None) == user_id


class TestSetup:
    def test_non_duplica_gli_handler(self):
        """Chiamandolo due volte i messaggi comparirebbero doppi."""
        setup_logging()
        primo = len(logging.getLogger().handlers)
        setup_logging()
        assert len(logging.getLogger().handlers) == primo

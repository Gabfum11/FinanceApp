"""Validazione della SECRET_KEY all'avvio.

os.getenv non protesta se la variabile manca: l'app partirebbe, /health
risponderebbe OK, e il fallimento arriverebbe al primo login con un errore
incomprensibile. Questi test verificano che invece l'avvio si interrompa.
"""
import pytest

from app.business_logic.security import (
    MIN_SECRET_KEY_LENGTH,
    _validate_secret_key,
)


class TestChiaviRifiutate:
    @pytest.mark.parametrize("mancante", [None, "", "   "])
    def test_chiave_assente(self, mancante):
        with pytest.raises(RuntimeError) as e:
            _validate_secret_key(mancante)
        assert "SECRET_KEY" in str(e.value)

    def test_il_messaggio_dice_dove_metterla(self):
        with pytest.raises(RuntimeError) as e:
            _validate_secret_key(None)
        messaggio = str(e.value)
        assert ".env" in messaggio and "Render" in messaggio

    @pytest.mark.parametrize("debole", ["secret", "SECRET", "changeme", "password", "test"])
    def test_valori_da_esempio(self, debole):
        with pytest.raises(RuntimeError) as e:
            _validate_secret_key(debole)
        assert "esempio" in str(e.value).lower() or "corta" in str(e.value).lower()

    def test_chiave_troppo_corta(self):
        with pytest.raises(RuntimeError) as e:
            _validate_secret_key("a" * (MIN_SECRET_KEY_LENGTH - 1))
        assert "corta" in str(e.value)

    def test_il_messaggio_spiega_come_generarne_una(self):
        with pytest.raises(RuntimeError) as e:
            _validate_secret_key("corta")
        assert "secrets.token_hex" in str(e.value)


class TestChiaviAccettate:
    def test_chiave_al_limite(self):
        chiave = "x" * MIN_SECRET_KEY_LENGTH
        assert _validate_secret_key(chiave) == chiave

    def test_chiave_esadecimale_da_64(self):
        """Il formato prodotto da secrets.token_hex(32)."""
        chiave = "a1b2c3d4" * 8
        assert _validate_secret_key(chiave) == chiave

    def test_restituisce_la_chiave_invariata(self):
        chiave = "una-chiave-lunga-abbastanza-per-passare-il-controllo"
        assert _validate_secret_key(chiave) == chiave


class TestFirmaDeiToken:
    """La validazione non deve aver cambiato il comportamento dei token."""

    def test_un_token_creato_viene_riletto(self):
        from app.business_logic import security

        token = security.create_access_token({"sub": "42"})
        assert security.decode_access_token(token)["sub"] == "42"

    def test_un_token_di_un_altra_chiave_resta_rifiutato(self):
        from datetime import datetime, timedelta, timezone
        from jose import jwt
        from app.business_logic import security

        falso = jwt.encode(
            {"sub": "42", "exp": datetime.now(timezone.utc) + timedelta(hours=1)},
            "un-altra-chiave-abbastanza-lunga-per-firmare",
            algorithm="HS256",
        )
        assert security.decode_access_token(falso) is None

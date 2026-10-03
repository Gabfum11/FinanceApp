"""Importi nei testi che partono dal server, come li scrive l'app con Intl."""
from app.business_logic.formato import formatta_importo


class TestFormatoItaliano:
    def test_euro(self):
        assert formatta_importo(12.99) == "12,99 €"

    def test_simbolo_dopo_il_numero_per_ogni_valuta(self):
        assert formatta_importo(12.99, "USD") == "12,99 $"
        assert formatta_importo(12.99, "GBP") == "12,99 £"
        assert formatta_importo(12.99, "CHF") == "12,99 CHF"

    def test_migliaia_separate_solo_da_diecimila(self):
        assert formatta_importo(1234.5) == "1234,50 €"
        assert formatta_importo(12345) == "12.345,00 €"


class TestFormatoInglese:
    def test_simbolo_davanti(self):
        assert formatta_importo(12.99, "USD", "en") == "$12.99"
        assert formatta_importo(1234.5, "GBP", "en") == "£1,234.50"

    def test_codice_di_lettere_staccato(self):
        assert formatta_importo(12.99, "CHF", "en") == "CHF 12.99"

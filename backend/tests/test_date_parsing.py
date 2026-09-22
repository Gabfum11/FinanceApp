"""Risoluzione delle espressioni di data nell'assistente.

Il modello restituisce l'espressione grezza ("mercoledi", "ieri") e la data la
calcola Python: chiedendogli di risolverla da solo sbagliava l'aritmetica sui
giorni della settimana, e in modo non deterministico sulla stessa frase.
"""
from datetime import date, timedelta

import pytest

from app.business_logic.categorization import _resolve_date_expr

# 20 settembre 2026 è una domenica
DOMENICA = date(2026, 9, 20)
GIORNI = ["lunedi", "martedi", "mercoledi", "giovedi", "venerdi", "sabato", "domenica"]


class TestEspressioniRelative:
    @pytest.mark.parametrize(
        "espressione,atteso",
        [
            ("oggi", date(2026, 9, 20)),
            ("ieri", date(2026, 9, 19)),
            ("altro ieri", date(2026, 9, 18)),
            ("l'altro ieri", date(2026, 9, 18)),
        ],
    )
    def test_risolve(self, espressione, atteso):
        assert _resolve_date_expr(espressione, DOMENICA) == atteso

    def test_maiuscole_ignorate(self):
        assert _resolve_date_expr("IERI", DOMENICA) == date(2026, 9, 19)

    def test_spazi_ignorati(self):
        assert _resolve_date_expr("  ieri  ", DOMENICA) == date(2026, 9, 19)


class TestGiorniDellaSettimana:
    def test_mercoledi_e_il_piu_recente_passato(self):
        assert _resolve_date_expr("mercoledi", DOMENICA) == date(2026, 9, 16)

    def test_accento_accettato(self):
        assert _resolve_date_expr("mercoledì", DOMENICA) == date(2026, 9, 16)

    def test_scorso_non_cambia_il_calcolo(self):
        """"sabato" e "sabato scorso" indicano lo stesso giorno."""
        assert _resolve_date_expr("sabato scorso", DOMENICA) == _resolve_date_expr("sabato", DOMENICA)

    def test_giorno_odierno_significa_settimana_scorsa(self):
        """Detto di domenica, "domenica" non è oggi ma sette giorni prima."""
        assert _resolve_date_expr("domenica", DOMENICA) == date(2026, 9, 13)

    @pytest.mark.parametrize("giorno", GIORNI)
    @pytest.mark.parametrize("scostamento", range(7))
    def test_sempre_nel_passato_e_sul_giorno_giusto(self, giorno, scostamento):
        """Da qualunque giorno di partenza, per tutti e sette i giorni."""
        oggi = date(2026, 9, 21) + timedelta(days=scostamento)  # 21/09 è un lunedì
        risolta = _resolve_date_expr(giorno, oggi)
        assert risolta is not None
        assert GIORNI[risolta.weekday()] == giorno
        assert 1 <= (oggi - risolta).days <= 7, "deve cadere nella settimana precedente"


class TestEspressioniNonRiconosciute:
    """Fuori dal vocabolario si restituisce None: meglio nessuna data che una inventata."""

    @pytest.mark.parametrize(
        "espressione",
        ["il 3", "la settimana scorsa", "due giorni fa", "2026-09-15", "", "   ", "domani"],
    )
    def test_restituisce_none(self, espressione):
        assert _resolve_date_expr(espressione, DOMENICA) is None

    @pytest.mark.parametrize("valore", [None, 12345, [], {}])
    def test_valori_non_testuali(self, valore):
        assert _resolve_date_expr(valore, DOMENICA) is None


class TestInvarianti:
    @pytest.mark.parametrize("espressione", GIORNI + ["oggi", "ieri", "altro ieri"])
    def test_mai_nel_futuro(self, espressione):
        risolta = _resolve_date_expr(espressione, DOMENICA)
        assert risolta <= DOMENICA, "una spesa non può essere stata fatta domani"

    @pytest.mark.parametrize("espressione", GIORNI)
    def test_stessa_espressione_stesso_risultato(self, espressione):
        """Il modello dava risultati diversi sulla stessa frase: qui è deterministico."""
        risultati = {_resolve_date_expr(espressione, DOMENICA) for _ in range(5)}
        assert len(risultati) == 1

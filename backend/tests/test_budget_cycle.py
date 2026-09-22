"""Ciclo di budget a giorno variabile.

Il budget non va dal 1 al 31 ma da un giorno scelto dall'utente
(budget_start_day): se lo stipendio arriva il 27, il "mese" va dal 27 al 26.
I casi limite stanno tutti nei mesi che non hanno il giorno scelto.
"""
from datetime import date

import pytest

from app.business_logic.budget import get_budget_cycle, safe_day


class TestSafeDay:
    """safe_day riporta un giorno inesistente all'ultimo del mese."""

    def test_giorno_esistente_resta_invariato(self):
        assert safe_day(2026, 1, 15) == 15

    def test_31_in_un_mese_di_30(self):
        assert safe_day(2026, 4, 31) == 30

    def test_31_a_febbraio(self):
        assert safe_day(2026, 2, 31) == 28

    def test_29_febbraio_anno_bisestile(self):
        assert safe_day(2024, 2, 29) == 29

    def test_29_febbraio_anno_non_bisestile(self):
        assert safe_day(2026, 2, 29) == 28


class TestCicloStandard:
    """Con start_day = 1 il ciclo coincide col mese di calendario."""

    def test_inizio_mese(self):
        start, end = get_budget_cycle(date(2026, 9, 15), 1)
        assert start == date(2026, 9, 1)
        assert end == date(2026, 9, 30)

    def test_primo_giorno_del_mese(self):
        start, end = get_budget_cycle(date(2026, 9, 1), 1)
        assert start == date(2026, 9, 1)

    def test_ultimo_giorno_del_mese(self):
        start, end = get_budget_cycle(date(2026, 9, 30), 1)
        assert start == date(2026, 9, 1)
        assert end == date(2026, 9, 30)


class TestCicloPersonalizzato:
    """Con start_day = 27 il ciclo va dal 27 al 26 del mese dopo."""

    def test_data_dopo_il_giorno_di_inizio(self):
        # il 28 settembre siamo già nel ciclo iniziato il 27
        start, end = get_budget_cycle(date(2026, 9, 28), 27)
        assert start == date(2026, 9, 27)
        assert end == date(2026, 10, 26)

    def test_data_prima_del_giorno_di_inizio(self):
        # il 10 settembre siamo ancora nel ciclo iniziato il 27 agosto
        start, end = get_budget_cycle(date(2026, 9, 10), 27)
        assert start == date(2026, 8, 27)
        assert end == date(2026, 9, 26)

    def test_esattamente_il_giorno_di_inizio(self):
        start, _ = get_budget_cycle(date(2026, 9, 27), 27)
        assert start == date(2026, 9, 27)

    def test_giorno_prima_dell_inizio(self):
        start, end = get_budget_cycle(date(2026, 9, 26), 27)
        assert start == date(2026, 8, 27)
        assert end == date(2026, 9, 26)


class TestGiorniCheNonEsistonoSempre:
    """start_day 29, 30 o 31: i mesi corti non hanno quel giorno."""

    def test_start_31_a_febbraio(self):
        # febbraio 2026 finisce il 28: il ciclo parte da lì
        start, _ = get_budget_cycle(date(2026, 2, 28), 31)
        assert start == date(2026, 2, 28)

    def test_start_31_ad_aprile(self):
        start, _ = get_budget_cycle(date(2026, 4, 30), 31)
        assert start == date(2026, 4, 30)

    def test_start_31_a_marzo_torna_al_31(self):
        # il mese dopo febbraio il giorno 31 esiste di nuovo
        start, _ = get_budget_cycle(date(2026, 3, 31), 31)
        assert start == date(2026, 3, 31)

    def test_start_30_a_febbraio_bisestile(self):
        start, _ = get_budget_cycle(date(2024, 2, 29), 30)
        assert start == date(2024, 2, 29)

    def test_inizio_gennaio_con_start_31(self):
        # il 5 gennaio si ricade nel ciclo iniziato a dicembre
        start, _ = get_budget_cycle(date(2026, 1, 5), 31)
        assert start == date(2025, 12, 31)


class TestCambioAnno:
    def test_gennaio_ricade_su_dicembre(self):
        start, end = get_budget_cycle(date(2026, 1, 10), 27)
        assert start == date(2025, 12, 27)
        assert end == date(2026, 1, 26)

    def test_dicembre_prosegue_a_gennaio(self):
        start, end = get_budget_cycle(date(2025, 12, 28), 27)
        assert start == date(2025, 12, 27)
        assert end == date(2026, 1, 26)


class TestInvarianti:
    """Proprietà che devono valere per qualsiasi combinazione."""

    @pytest.mark.parametrize("start_day", [1, 5, 15, 27, 28, 29, 30, 31])
    @pytest.mark.parametrize("month", range(1, 13))
    def test_la_data_cade_sempre_dentro_il_proprio_ciclo(self, start_day, month):
        reference = date(2026, month, 15)
        start, end = get_budget_cycle(reference, start_day)
        assert start <= reference <= end, (
            f"{reference} fuori dal ciclo {start}–{end} (start_day={start_day})"
        )

    @pytest.mark.parametrize("start_day", [1, 15, 27, 31])
    @pytest.mark.parametrize("month", range(1, 13))
    def test_il_ciclo_non_e_mai_vuoto_o_invertito(self, start_day, month):
        start, end = get_budget_cycle(date(2026, month, 15), start_day)
        assert start < end

    @pytest.mark.parametrize("start_day", [1, 15, 27, 31])
    def test_cicli_consecutivi_non_lasciano_buchi(self, start_day):
        """Il giorno dopo la fine di un ciclo deve iniziare il successivo."""
        _, end = get_budget_cycle(date(2026, 5, 15), start_day)
        giorno_dopo = date.fromordinal(end.toordinal() + 1)
        start_successivo, _ = get_budget_cycle(giorno_dopo, start_day)
        assert start_successivo == giorno_dopo

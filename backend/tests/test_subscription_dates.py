"""Calcolo delle date dei rinnovi.

Il caso critico è l'abbonamento partito il 29, 30 o 31: passando per un mese
corto la data slitta, e senza un ancoraggio al giorno originale resterebbe
bloccata lì per sempre.
"""
from datetime import date, timedelta

import pytest

from app.routers.subscriptions import advance, MAX_BACKFILL


class TestAdvance:
    def test_mensile(self):
        assert advance(date(2026, 1, 15), "monthly") == date(2026, 2, 15)

    def test_settimanale(self):
        assert advance(date(2026, 1, 15), "weekly") == date(2026, 1, 22)

    def test_annuale(self):
        assert advance(date(2026, 1, 15), "yearly") == date(2027, 1, 15)

    def test_cambio_anno(self):
        assert advance(date(2026, 12, 15), "monthly") == date(2027, 1, 15)


class TestGiorno31:
    """Un abbonamento partito il 31 deve tornare al 31 dopo i mesi corti."""

    def test_senza_ancoraggio_resta_bloccato(self):
        # comportamento di relativedelta da solo: il difetto che anchor_day risolve
        d = date(2026, 1, 31)
        d = advance(d, "monthly")  # 28 feb
        d = advance(d, "monthly")  # 28 mar, non 31
        assert d == date(2026, 3, 28)

    def test_con_ancoraggio_torna_al_31(self):
        d = date(2026, 1, 31)
        sequenza = [d]
        for _ in range(5):
            d = advance(d, "monthly", anchor_day=31)
            sequenza.append(d)
        assert sequenza == [
            date(2026, 1, 31),
            date(2026, 2, 28),
            date(2026, 3, 31),
            date(2026, 4, 30),
            date(2026, 5, 31),
            date(2026, 6, 30),
        ]

    def test_29_febbraio_bisestile(self):
        d = date(2024, 2, 29)
        assert advance(d, "yearly", anchor_day=29) == date(2025, 2, 28)

    def test_settimanale_ignora_ancoraggio(self):
        # per il settimanale il giorno del mese non ha senso
        assert advance(date(2026, 1, 31), "weekly", anchor_day=31) == date(2026, 2, 7)


def simula_backfill(start, frequency, today):
    """Replica il ciclo di create_subscription: le date dovute e il prossimo rinnovo."""
    anchor = start.day if frequency != "weekly" else None
    dovute, next_date = [], start
    while next_date <= today:
        dovute.append(next_date)
        next_date = advance(next_date, frequency, anchor)
        if len(dovute) > MAX_BACKFILL:
            return None, None  # oltre il limite: rifiutato
    return dovute, next_date


TODAY = date(2026, 9, 20)


class TestArretrati:
    def test_parte_oggi_un_solo_addebito(self):
        dovute, next_date = simula_backfill(TODAY, "monthly", TODAY)
        assert len(dovute) == 1
        assert next_date == date(2026, 10, 20)

    def test_parte_da_sette_mesi(self):
        dovute, next_date = simula_backfill(date(2026, 3, 15), "monthly", TODAY)
        assert len(dovute) == 7
        assert next_date == date(2026, 10, 15)

    def test_data_futura_nessun_arretrato(self):
        dovute, next_date = simula_backfill(date(2026, 10, 1), "monthly", TODAY)
        assert dovute == []
        assert next_date == date(2026, 10, 1)

    def test_esattamente_al_limite_accettato(self):
        dovute, _ = simula_backfill(date(2025, 10, 20), "monthly", TODAY)
        assert len(dovute) == MAX_BACKFILL

    @pytest.mark.parametrize(
        "start,frequency,descrizione",
        [
            (date(2024, 9, 20), "monthly", "mensile da 2 anni"),
            (date(2021, 9, 20), "monthly", "mensile da 5 anni"),
            (date(2025, 9, 20), "weekly", "settimanale da 1 anno"),
            (date(2016, 9, 20), "monthly", "anno digitato male"),
        ],
    )
    def test_oltre_il_limite_rifiutato(self, start, frequency, descrizione):
        dovute, _ = simula_backfill(start, frequency, TODAY)
        assert dovute is None, f"{descrizione} doveva essere rifiutato"

    def test_il_prossimo_rinnovo_e_sempre_futuro(self):
        for giorni in [0, 1, 30, 200, 360]:
            start = TODAY - timedelta(days=giorni)
            dovute, next_date = simula_backfill(start, "monthly", TODAY)
            if dovute is not None:
                assert next_date > TODAY

"""Ogni estratto vero in tests/estratti/ deve dare il risultato atteso accanto.

Una correzione per una banca non deve rompere le altre: questo test lo dice.
Gli estratti sono anonimizzati (nome, IBAN e carta sostituiti) e accanto a
ognuno c'e' un .json con quanti movimenti e quante uscite contiene, il primo
movimento e alcuni nomi puliti attesi.
"""
import json
from datetime import date
from pathlib import Path

import pytest

from app.business_logic.import_lettura import leggi_estratto
from app.business_logic.import_pulizia import pulisci_nome

CARTELLA = Path(__file__).parent / "estratti"
ESTRATTI = sorted(p for p in CARTELLA.glob("*") if p.suffix in {".xlsx", ".xls", ".csv"})


@pytest.mark.parametrize("percorso", ESTRATTI, ids=lambda p: p.name)
def test_estratto_vero(percorso):
    atteso = json.loads(percorso.with_suffix(".json").read_text(encoding="utf-8"))
    movimenti = leggi_estratto(percorso.read_bytes(), date(2026, 12, 31))
    assert len(movimenti) == atteso["movimenti"]
    assert sum(m.uscita for m in movimenti) == atteso["uscite"]
    primo = movimenti[0]
    assert (primo.data.isoformat(), primo.importo, primo.uscita) == (
        atteso["primo"]["data"], atteso["primo"]["importo"], atteso["primo"]["uscita"],
    )
    for testo, nome in atteso.get("nomi", {}).items():
        assert pulisci_nome(testo) == nome

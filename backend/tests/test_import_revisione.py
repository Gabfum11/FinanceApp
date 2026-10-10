"""Casi trovati dalla revisione finale dell'import: ognuno ha rotto il codice prima della correzione."""
import io
from datetime import date
from unittest.mock import patch

import openpyxl
import pytest

from app import models
from app.business_logic import import_categorie
from app.business_logic.import_categorie import proponi
from app.business_logic.import_lettura import FileNonLeggibile, leggi_estratto
from app.business_logic.import_pulizia import BONIFICO, NON_SPESA, pulisci_nome, tipo_movimento

OGGI = date(2026, 10, 10)


def xlsx(righe):
    libro = openpyxl.Workbook()
    for riga in righe:
        libro.active.append(riga)
    uscita = io.BytesIO()
    libro.save(uscita)
    return uscita.getvalue()


# --- carta di credito con un rimborso ----------------------------------------

def test_carta_con_un_rimborso_negativo_resta_un_elenco_di_spese():
    testo = "Data;Descrizione;Importo\n02/09/2026;AMAZON;25,00\n03/09/2026;ESSELUNGA;40,00\n" \
            "05/09/2026;STORNO AMAZON;-25,00\n06/09/2026;BAR;3,00\n"
    movimenti = leggi_estratto(testo.encode(), OGGI)
    assert [(m.testo, m.uscita) for m in movimenti] == [
        ("AMAZON", True), ("ESSELUNGA", True), ("STORNO AMAZON", False), ("BAR", True),
    ]


# --- privacy: niente codici ne' persone verso l'AI ---------------------------

@pytest.mark.parametrize("testo", [
    "PAGAMENTO POS 5355XXXXXXXX1234 DEL BAR CENTRALE",
    "ADDEBITO SDD ENEL ENERGIA CID IT56ZZZ0000006832200967 MANDATO ABC123XYZ",
    "ADDEBITO DIRETTO TIM SPA RIF 9X8Y7Z6W5V",
])
def test_nessun_codice_resta_nel_nome(testo):
    nome = pulisci_nome(testo)
    assert not any(c.isdigit() for c in nome), nome
    assert "Cid" not in nome and "Mandato" not in nome and "Rif" not in nome


@pytest.mark.parametrize("testo", [
    "SEPA CREDIT TRANSFER TO GIULIA BIANCHI IBAN IT60X0542811101000000123456",
    "BONIF. A FAVORE DI MARIO ROSSI",
    "BON. ISTANTANEO A MARIO ROSSI",
    "DISPOSIZIONE A FAVORE DI MARIO ROSSI",
    "SATISPAY*MARIO ROSSI",
    "PAYPAL *MARIO ROSSI",
])
def test_pagamenti_a_persone_sono_bonifici(testo):
    #i bonifici non vanno mai all'AI: il nome di una persona resta qui
    assert tipo_movimento(testo) == BONIFICO


def test_bonifico_sepa_senza_iban_nel_nome():
    nome = pulisci_nome("SEPA CREDIT TRANSFER TO GIULIA BIANCHI IBAN IT60X0542811101000000123456")
    assert not any(c.isdigit() for c in nome) and "Iban" not in nome


def test_saldo_con_data_non_e_una_spesa():
    assert tipo_movimento("SALDO FINALE") == NON_SPESA


# --- file che non devono dare errore 500 ------------------------------------

def test_csv_con_virgolette_aperte():
    testo = 'Data;Descrizione;Importo\n02/09/2026;"CONAD;-1,00\n' + "x" * 200_000 + "\n"
    with pytest.raises(FileNonLeggibile):
        leggi_estratto(testo.encode(), OGGI)


# --- estratti realistici che venivano rifiutati ------------------------------

def test_saldo_iniziale_sotto_l_intestazione():
    contenuto = xlsx([
        ["Data", "Descrizione", "Importo"],
        [None, "Saldo iniziale", "1.000,00"],
        ["02/09/2026", "CONAD", "-42,30"],
        ["03/09/2026", "Q8", "-55,00"],
    ])
    assert [m.testo for m in leggi_estratto(contenuto, OGGI)] == ["CONAD", "Q8"]


def test_righe_senza_data_in_fondo_non_contano():
    righe = [["Data", "Descrizione", "Importo"]] + [["02/09/2026", "CONAD", "-1,00"]] * 8 + [
        [None, "I movimenti sono soggetti a verifica", None],
        [None, "Per informazioni chiama il numero verde", None],
        [None, "Documento non valido ai fini fiscali", None],
    ]
    assert len(leggi_estratto(xlsx(righe), OGGI)) == 8


def test_foglio_enorme_si_ferma_presto():
    righe = [["Data", "Descrizione", "Importo"]] + [["02/09/2026", "CONAD", "-1,00"]] * 5000
    with pytest.raises(FileNonLeggibile) as errore:
        leggi_estratto(xlsx(righe), OGGI)
    assert errore.value.motivo == "troppe_righe"


# --- parole chiave solo come parole intere -----------------------------------

@pytest.fixture
def db(db_session):
    s = db_session()
    yield s
    s.close()


def test_parola_chiave_dentro_un_altra_parola_non_conta(db, make_user):
    casa = models.Category(name="Casa")
    db.add(casa)
    db.flush()
    gas = models.Category(name="Bolletta gas", parent_id=casa.id, keywords="gas")
    db.add(gas)
    db.commit()
    utente = make_user(email="io@example.com")
    with patch.object(import_categorie, "chiedi_ai", return_value={}):
        proposte = proponi([("Gastronomia Rossi", "gastronomia rossi"), ("Gas Naturale Spa", "gas naturale spa")], utente, db)
    assert proposte["Gastronomia Rossi"].categoria_id is None
    assert proposte["Gas Naturale Spa"].categoria_id == gas.id

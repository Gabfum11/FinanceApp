"""Lettura dell'estratto conto: importi, date, tabella."""
from datetime import date, datetime

import pytest

from app.business_logic.import_lettura import leggi_data, leggi_importo

OGGI = date(2026, 10, 10)


@pytest.mark.parametrize("valore, atteso", [
    ("-42,30", (42.3, True)),
    ("42,30", (42.3, None)),
    ("1.234,56", (1234.56, None)),
    ("-1.234,56 €", (1234.56, True)),
    ("1,234.56", (1234.56, None)),
    ("42,30 D", (42.3, True)),
    ("1500,00 C", (1500.0, False)),
    ("12,30 EUR", (12.3, None)),
    ("12.30", (12.3, None)),
    ("1.500", (1500.0, None)),
    (-55, (55.0, True)),
    (13.99, (13.99, None)),
])
def test_leggi_importo(valore, atteso):
    assert leggi_importo(valore) == atteso


@pytest.mark.parametrize("valore", [None, "", "abc", "0,00", 0, "DATA", True])
def test_leggi_importo_non_valido(valore):
    assert leggi_importo(valore) is None


@pytest.mark.parametrize("valore, atteso", [
    ("02/09/2026", date(2026, 9, 2)),
    ("2/9/26", date(2026, 9, 2)),
    ("02.09.2026", date(2026, 9, 2)),
    ("2026-09-02", date(2026, 9, 2)),
    ("02/09/2026 15:42", date(2026, 9, 2)),
    ("02-09", date(2026, 9, 2)),
    (datetime(2026, 9, 2, 0, 0), date(2026, 9, 2)),
    (date(2026, 9, 2), date(2026, 9, 2)),
    (46267, date(2026, 9, 2)),
    (46267.0, date(2026, 9, 2)),
])
def test_leggi_data(valore, atteso):
    assert leggi_data(valore, OGGI) == atteso


def test_data_senza_anno_a_cavallo_d_anno():
    #estratto di dicembre caricato a gennaio: il 15/12 e' dell'anno prima
    assert leggi_data("15-12", date(2027, 1, 10)) == date(2026, 12, 15)


@pytest.mark.parametrize("valore", [None, "", "31/02/2026", "Saldo finale", 12, "CONAD"])
def test_leggi_data_non_valida(valore):
    assert leggi_data(valore, OGGI) is None


# --- tabella ------------------------------------------------------------------

import io

import openpyxl

from app.business_logic.import_lettura import FileNonLeggibile, Movimento, leggi_estratto


def xlsx(righe: list[list]) -> bytes:
    """Un file Excel vero, scritto in memoria con le righe date."""
    libro = openpyxl.Workbook()
    foglio = libro.active
    for riga in righe:
        foglio.append(riga)
    uscita = io.BytesIO()
    libro.save(uscita)
    return uscita.getvalue()


def test_due_colonne_addebiti_accrediti_con_righe_sopra():
    #stile Postepay: intestatario e periodo sopra la tabella, saldo in fondo
    contenuto = xlsx([
        ["Estratto conto carta Postepay Evolution"],
        ["Titolare: MARIO ROSSI", None, "Carta: **** 1234"],
        [],
        ["Data contabile", "Data valuta", "Addebiti", "Accrediti", "Descrizione operazioni"],
        ["02/09/2026", "02/09/2026", "42,30", None, "PAGAMENTO POS CONAD SUPERSTORE ROMA"],
        ["05/09/2026", "05/09/2026", None, "1.500,00", "BONIFICO DA ACME SRL STIPENDIO"],
        ["08/09/2026", "08/09/2026", "13,99", None, "PAGAMENTO WEB NETFLIX.COM"],
        ["Saldo finale", None, None, None, "1.234,56"],
    ])
    assert leggi_estratto(contenuto, OGGI) == [
        Movimento(date(2026, 9, 2), "PAGAMENTO POS CONAD SUPERSTORE ROMA", 42.3, True),
        Movimento(date(2026, 9, 5), "BONIFICO DA ACME SRL STIPENDIO", 1500.0, False),
        Movimento(date(2026, 9, 8), "PAGAMENTO WEB NETFLIX.COM", 13.99, True),
    ]


def test_una_colonna_con_segno_e_descrizione_su_due_colonne():
    contenuto = xlsx([
        ["Elenco movimenti"], ["Esportato il 01/10/2026"], [], [], [], [],
        ["Data", "Operazione", "Dettagli", "Valuta", "Importo"],
        ["30/09/2026", "Pagamento carta", "SUMUP *BAR CENTRAL", "EUR", "-3,20"],
        ["27/09/2026", "Bonifico ricevuto", "ROSSI GIULIA RIMBORSO", "EUR", "25,00"],
    ])
    assert leggi_estratto(contenuto, OGGI) == [
        Movimento(date(2026, 9, 30), "Pagamento carta SUMUP *BAR CENTRAL", 3.2, True),
        Movimento(date(2026, 9, 27), "Bonifico ricevuto ROSSI GIULIA RIMBORSO", 25.0, False),
    ]


def test_date_seriali_e_colonna_saldo_ignorata():
    contenuto = xlsx([
        ["Data", "Importo", "Descrizione", "Saldo"],
        [46267, -42.3, "CONAD", 1457.7],
        [46270, -55, "Q8 VIA ROMA", 1402.7],
    ])
    movimenti = leggi_estratto(contenuto, OGGI)
    assert [(m.data, m.importo, m.uscita) for m in movimenti] == [
        (date(2026, 9, 2), 42.3, True), (date(2026, 9, 5), 55.0, True),
    ]


def test_importo_con_lettera_del_verso():
    contenuto = xlsx([
        ["Data operazione", "Descrizione", "Importo"],
        ["02/09/2026", "CONAD", "42,30 D"],
        ["05/09/2026", "ACME SRL", "1500,00 C"],
    ])
    assert [m.uscita for m in leggi_estratto(contenuto, OGGI)] == [True, False]


def test_carta_di_credito_tutta_positiva_sono_uscite():
    #nessun segno, nessuna colonna del verso: e' l'elenco delle spese della carta
    contenuto = xlsx([
        ["Data", "Descrizione", "Importo"],
        ["02/09/2026", "AMAZON", "29,99"],
        ["03/09/2026", "ESSELUNGA", "54,10"],
    ])
    assert [m.uscita for m in leggi_estratto(contenuto, OGGI)] == [True, True]


def test_saldo_carta_con_data_non_ferma_la_lettura():
    contenuto = xlsx([
        ["Data", "Descrizione", "Importo"],
        ["02/09/2026", "CONAD", "-42,30"],
        ["10/09/2026", "ADDEBITO SALDO CARTA DI CREDITO", "-412,80"],
        ["12/09/2026", "Q8", "-55,00"],
        ["Totale", None, "-510,10"],
    ])
    assert [m.testo for m in leggi_estratto(contenuto, OGGI)] == [
        "CONAD", "ADDEBITO SALDO CARTA DI CREDITO", "Q8",
    ]


def test_csv_con_punto_e_virgola_in_codifica_windows():
    testo = "Data;Descrizione;Importo\n02/09/2026;CAFFÈ CENTRALE;-1,20\n"
    movimenti = leggi_estratto(testo.encode("cp1252"), OGGI)
    assert movimenti == [Movimento(date(2026, 9, 2), "CAFFÈ CENTRALE", 1.2, True)]


def test_csv_con_virgola_utf8():
    testo = "Date,Description,Amount\n2026-09-02,CONAD,-42.30\n"
    assert leggi_estratto(testo.encode("utf-8-sig"), OGGI)[0].importo == 42.3


@pytest.mark.parametrize("contenuto", [
    b"<html><body><table><tr><td>Data</td></tr></table></body></html>",
    b"",
    b"\x00\x01\x02\x03",
    "Mov.;Rif.;Desc.;EUR\n02-09;A71234;CONAD;42,30 D\n".encode(),
])
def test_file_non_riconosciuto(contenuto):
    with pytest.raises(FileNonLeggibile) as errore:
        leggi_estratto(contenuto, OGGI)
    assert errore.value.motivo == "non_riconosciuto"


def test_troppe_righe():
    righe = [["Data", "Descrizione", "Importo"]] + [["02/09/2026", "CONAD", "-1,00"]] * 2001
    with pytest.raises(FileNonLeggibile) as errore:
        leggi_estratto(xlsx(righe), OGGI)
    assert errore.value.motivo == "troppe_righe"

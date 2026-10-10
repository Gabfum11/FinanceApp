"""Pulizia del testo della banca: tipo di movimento e nome leggibile."""
import pytest

from app.business_logic.import_pulizia import (
    BONIFICO, NON_SPESA, PAGAMENTO, chiave_esercente, pulisci_nome, tipo_movimento,
)


@pytest.mark.parametrize("testo, tipo", [
    ("PAGAMENTO POS CONAD SUPERSTORE ROMA", PAGAMENTO),
    ("ADDEBITO SDD ENEL ENERGIA SPA", PAGAMENTO),
    ("RICARICA TELEFONICA TIM", PAGAMENTO),
    ("BONIFICO A FAVORE DI BIANCHI GIULIA", BONIFICO),
    ("PRELIEVO BANCOMAT 100,00", NON_SPESA),
    ("PRELEVAMENTO ATM", NON_SPESA),
    ("GIROCONTO A CONTO DEPOSITO", NON_SPESA),
    ("BONIFICO GIROCONTO", NON_SPESA),
    ("RICARICA CARTA POSTEPAY", NON_SPESA),
    ("ADDEBITO SALDO CARTA DI CREDITO", NON_SPESA),
])
def test_tipo_movimento(testo, tipo):
    assert tipo_movimento(testo) == tipo


@pytest.mark.parametrize("testo, nome", [
    ("PAGAMENTO POS CONAD SUPERSTORE ROMA", "Conad Superstore Roma"),
    ("PAGAMENTO POS 12,30 EUR DEL 08.09.26 ORE 12:31 CONAD SUPERSTORE CARTA 1234", "Conad Superstore"),
    ("POS 4521 03/09/26 15:42 GAMMA SRL MILANO CARTA *1234", "Gamma Srl Milano"),
    ("SUMUP *BAR CENTRAL", "Bar Central"),
    ("NEXI*FARMACIA ROSSI", "Farmacia Rossi"),
    ("ADDEBITO SDD ENEL ENERGIA SPA", "Enel Energia Spa"),
    ("PAGAMENTO WEB NETFLIX.COM", "Netflix"),
    ("AMZN Mktp IT*2K3", "Amazon"),
    ("PAYPAL *EBAY", "eBay"),
    ("STORNO AMAZON EU", "Amazon"),
    ("BONIFICO A FAVORE DI BIANCHI GIULIA", "Bonifico a Bianchi Giulia"),
    ("PRELIEVO BANCOMAT 100,00", "Prelievo Bancomat"),
    ("Pagamento carta SUMUP *BAR CENTRAL", "Bar Central"),
    #il portafoglio non e' il negozio: il nome vero viene dopo
    ("Pagamento Google Pay SHAKE UP 3 16/09/2026 10.33", "Shake Up"),
    ("PAGAMENTO APPLE PAY BAR CENTRAL 12/09/2026", "Bar Central"),
    ("Samsung Pay CONAD SUPERSTORE", "Conad Superstore"),
    ("GOOGLE *YOUTUBE PREMIUM", "Google"),
])
def test_pulisci_nome(testo, nome):
    assert pulisci_nome(testo) == nome


def test_nome_vuoto_dopo_la_pulizia_tiene_il_testo():
    assert pulisci_nome("POS 1234") == "Pos 1234"


def test_chiave_esercente():
    assert chiave_esercente("  Bar   Central ") == "bar central"
    assert chiave_esercente(pulisci_nome("SUMUP *BAR CENTRAL")) == chiave_esercente(pulisci_nome("BAR CENTRAL"))

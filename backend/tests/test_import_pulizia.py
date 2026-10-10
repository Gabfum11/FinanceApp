"""Pulizia del testo della banca: tipo di movimento e nome leggibile."""
import pytest

from app.business_logic.import_pulizia import (
    BONIFICO, NON_SPESA, PAGAMENTO, chiave_esercente, esercente, motivo, pulisci_nome, tipo_movimento,
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
    #P2P di Postepay: soldi a una persona, come un bonifico
    ("P2P A ROSSI   MARIO per cocktail", BONIFICO),
    ("COMMISSIONI P2P A ROSSI   MARIO per viaggio", BONIFICO),
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
    ("AMZN Mktp IT*2K3", "Amazon Mktp"),
    ("PAYPAL *EBAY", "eBay"),
    ("STORNO AMAZON EU", "Amazon Eu"),
    ("BONIFICO A FAVORE DI BIANCHI GIULIA", "Bonifico a Bianchi Giulia"),
    ("PRELIEVO BANCOMAT 100,00", "Prelievo Bancomat"),
    ("Pagamento carta SUMUP *BAR CENTRAL", "Bar Central"),
    #il portafoglio non e' il negozio: il nome vero viene dopo
    ("Pagamento Google Pay SHAKE UP 3 16/09/2026 10.33", "Shake Up"),
    ("PAGAMENTO APPLE PAY BAR CENTRAL 12/09/2026", "Bar Central"),
    ("Samsung Pay CONAD SUPERSTORE", "Conad Superstore"),
    #i marchi si scrivono bene ma non si mangiano il resto: e' il dettaglio
    #che fa ricordare l'acquisto
    ("GOOGLE *YOUTUBE PREMIUM", "Google Youtube Premium"),
    ("PAGAMENTO POS AMAZON CUFFIE BLUETOOTH", "Amazon Cuffie Bluetooth"),
    ("PAGAMENTO POS MCDONALDS MILANO CENTRALE", "McDonald's Milano Centrale"),
    #la causale di un bonifico dice a cosa serviva: resta, il riferimento no
    ("BONIFICO A FAVORE DI ROSSI MARIO RIF 123456 AFFITTO SETTEMBRE", "Bonifico a Rossi Mario Affitto Settembre"),
    #pagamenti a persone (formato Postepay): chi e per cosa, senza codici
    ("BONIFICO SEPA ISTANTANEO TRN BPPIITRRXXX CCTX00000388136080 A VERDI ANGELO PER regalo",
     "Bonifico a Verdi Angelo per regalo"),
    ("COMMISSIONI BONIFICO TRN BPPIITRRXXX CCTX00000388136080 A VERDI ANGELO PER regalo",
     "Commissioni bonifico a Verdi Angelo per regalo"),
    ("BONIFICO SEPA ISTANTANEO TRN BPPIITRRXXX CCTX00000379490578 A Mario D'Angelo  PER regalo",
     "Bonifico a Mario D'Angelo per regalo"),
    ("P2P A ROSSI   MARIO per film mostri", "P2P a Rossi Mario per film mostri"),
    ("P2P A ROSSI   MARIO", "P2P a Rossi Mario"),
    ("COMMISSIONI P2P A ROSSI   MARIO per viaggio", "Commissioni P2P a Rossi Mario per viaggio"),
    ("BONIFICO A FAVORE DI MARIO ROSSI PER CENA SABATO", "Bonifico a Mario Rossi per cena sabato"),
    ("SATISPAY*MARIO ROSSI", "Satispay a Mario Rossi"),
    ("PAYPAL *MARIO ROSSI", "PayPal a Mario Rossi"),
    #la "A" di "a" non si mangia l'iniziale di chi si chiama Andrea
    ("BONIFICO SEPA ISTANTANEO TRN BPPIITRRXXX CCTX00000355659610 A Andrea Verdi PER Regalo",
     "Bonifico a Andrea Verdi per regalo"),
    ("P2P A ANTONIO   ROSSI per pizza", "P2P a Antonio Rossi per pizza"),
    #export di Postepay: "Op." col numero dell'operazione in coda, "E-Commerce" in testa
    ("Pagamento Google Pay PASSION FRUIT 26/09/2026 23.33 BARI Op. 673184", "Passion Fruit Bari"),
    ("Pagamento E-Commerce TRENITALIA - PT WL CC 25/09/2026 18.54 ROMA Op. 674957", "Trenitalia Pt Wl Cc Roma"),
])
def test_pulisci_nome(testo, nome):
    assert pulisci_nome(testo) == nome


def test_nome_vuoto_dopo_la_pulizia_tiene_il_testo():
    assert pulisci_nome("POS 1234") == "Pos 1234"


def test_chiave_esercente():
    assert chiave_esercente("  Bar   Central ") == "bar central"


@pytest.mark.parametrize("testi, chiave", [
    (["SUMUP *BAR CENTRAL", "BAR CENTRAL"], "bar central"),
    #il dettaglio dell'acquisto cambia ogni volta, il negozio no
    (["AMZN Mktp IT*2K3", "PAGAMENTO POS AMAZON CUFFIE BLUETOOTH", "STORNO AMAZON EU"], "amazon"),
    (["Pagamento Google Pay SHAKE UP 3 16/09/2026 10.33", "SHAKE UP"], "shake up"),
])
def test_esercente_resta_corto(testi, chiave):
    assert {esercente(t) for t in testi} == {chiave}


def test_esercente_di_un_pagamento_a_persona_e_la_persona():
    #il motivo cambia ogni volta: "applica alle altre" deve raggruppare per persona
    assert esercente("P2P A ROSSI   MARIO per cocktail") == esercente("P2P A ROSSI MARIO per film") == "p2p a rossi mario"
    assert esercente("BONIFICO SEPA TRN BPPIITRRXXX CCTX00000388136080 A VERDI ANGELO PER regalo")         == "bonifico a verdi angelo"
    assert esercente("BONIFICO A FAVORE DI BIANCHI GIULIA") != esercente("BONIFICO A FAVORE DI VERDI ANGELO")


@pytest.mark.parametrize("testo, atteso", [
    ("P2P A ROSSI   MARIO per film mostri", "film mostri"),
    ("BONIFICO SEPA ISTANTANEO TRN BPPIITRRXXX CCTX00000388136080 A VERDI ANGELO PER regalo", "regalo"),
    ("BONIFICO A FAVORE DI MARIO ROSSI PER FATTURA 123456 DEL 03/09/2026", "fattura"),
    #senza motivo non c'e' niente da mandare all'AI
    ("P2P A ROSSI   MARIO", None),
    ("P2P A ROSSI   MARIO per -", None),
    #un negozio non ha motivo: va all'AI il suo nome
    ("PAGAMENTO POS BAR PER TUTTI MILANO", None),
])
def test_motivo(testo, atteso):
    assert motivo(testo) == atteso

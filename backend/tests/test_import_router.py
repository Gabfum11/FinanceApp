"""Le chiamate dell'import: anteprima, conferma, annullamento."""
import io
from datetime import date
from unittest.mock import patch

import openpyxl
import pytest

from app import models
from app.business_logic import import_categorie

OGGI = "2026-10-10"
TIPO_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def xlsx(righe):
    libro = openpyxl.Workbook()
    for riga in righe:
        libro.active.append(riga)
    uscita = io.BytesIO()
    libro.save(uscita)
    return uscita.getvalue()


ESTRATTO = xlsx([
    ["Data", "Descrizione", "Importo"],
    ["02/09/2026", "PAGAMENTO POS CONAD SUPERSTORE ROMA", "-63,10"],
    ["03/09/2026", "POS 4521 03/09/26 15:42 GAMMA SRL MILANO CARTA *1234", "-45,00"],
    ["05/09/2026", "BONIFICO DA ACME SRL STIPENDIO", "1.500,00"],
    ["06/09/2026", "AMZN Mktp IT*2K3", "-29,99"],
    ["12/09/2026", "STORNO AMAZON EU", "29,99"],
    ["15/09/2026", "BONIFICO A FAVORE DI BIANCHI GIULIA", "-350,00"],
    ["18/09/2026", "PRELIEVO BANCOMAT", "-100,00"],
])


@pytest.fixture
def db(db_session):
    s = db_session()
    yield s
    s.close()


@pytest.fixture
def categorie(db):
    cibo = models.Category(name="Cibo")
    db.add(cibo)
    db.flush()
    spesa = models.Category(name="Spesa alimentare", parent_id=cibo.id, keywords="conad")
    db.add(spesa)
    db.commit()
    return {"cibo": cibo.id, "spesa": spesa.id}


@pytest.fixture
def utente(make_user, login_as):
    utente_id = make_user(email="io@example.com")
    login_as(utente_id)
    return utente_id


def anteprima(client, contenuto=ESTRATTO, nome="estratto.xlsx"):
    #l'AI non si chiama mai davvero: qui risponde sempre "non so"
    with patch.object(import_categorie, "chiedi_ai", return_value={}) as ai:
        risposta = client.post("/import/anteprima", files={"file": (nome, contenuto, TIPO_XLSX)},
                               headers={"X-Local-Date": OGGI})
    return risposta, ai


def test_anteprima_righe_e_messaggi(client, db, categorie, utente):
    risposta, ai = anteprima(client)
    assert risposta.status_code == 200
    dati = risposta.json()
    assert dati["dal"] == "2026-09-02" and dati["al"] == "2026-09-18"
    per_nome = {r["nome"]: r for r in dati["righe"]}
    #le entrate non diventano righe
    assert set(per_nome) == {"Conad Superstore Roma", "Gamma Srl Milano", "Amazon Mktp",
                             "Bonifico a Bianchi Giulia", "Prelievo Bancomat"}
    assert per_nome["Conad Superstore Roma"]["categoria_id"] == categorie["spesa"]
    assert per_nome["Conad Superstore Roma"]["messaggio"] is None
    assert per_nome["Gamma Srl Milano"]["messaggio"] == "categoria"
    #"Amazon Mktp" e "Amazon Eu" sono lo stesso negozio: il rimborso si collega
    assert per_nome["Amazon Mktp"]["messaggio"] == "rimborso_totale"
    assert per_nome["Amazon Mktp"]["esercente"] == "amazon"
    assert per_nome["Amazon Mktp"]["selezionata"] is False
    assert per_nome["Bonifico a Bianchi Giulia"]["messaggio"] == "categoria"
    assert per_nome["Prelievo Bancomat"]["messaggio"] == "non_spesa"
    #all'AI non arrivano bonifici ne' righe gia' risolte
    inviati = ai.call_args.args[0]
    assert "Bonifico a Bianchi Giulia" not in inviati and "Conad Superstore Roma" not in inviati
    #privacy: nei nomi inviati non restano cifre (importi, date, carte, riferimenti)
    assert inviati and all(not any(c.isdigit() for c in nome) for nome in inviati)


def test_dei_pagamenti_a_persone_all_ai_arriva_solo_il_motivo(client, db, categorie, utente):
    contenuto = xlsx([["Data", "Descrizione", "Importo"],
                      ["02/09/2026", "P2P A ROSSI   MARIO per spesa conad", "-4,00"],
                      ["03/09/2026", "P2P A VERDI   ANGELO per cocktail", "-5,00"],
                      ["04/09/2026", "P2P A BIANCHI   GIULIA", "-1,00"]])
    with patch.object(import_categorie, "chiedi_ai", return_value={}) as ai:
        risposta = client.post("/import/anteprima", files={"file": ("e.xlsx", contenuto, TIPO_XLSX)},
                               headers={"X-Local-Date": OGGI})
    per_nome = {r["nome"]: r for r in risposta.json()["righe"]}
    #"spesa conad" la riconoscono le parole chiave: la categoria arriva senza AI
    assert per_nome["P2P a Rossi Mario per spesa conad"]["categoria_id"] == categorie["spesa"]
    inviati = ai.call_args.args[0]
    assert inviati == ["cocktail"]
    assert per_nome["P2P a Bianchi Giulia"]["categoria_id"] is None


def test_anteprima_non_scrive_niente(client, db, categorie, utente):
    anteprima(client)
    assert db.query(models.Expense).count() == 0


def test_anteprima_segna_i_doppioni(client, db, categorie, utente):
    db.add(models.Expense(user_id=utente, description="Conad", amount=63.1, date=date(2026, 9, 2),
                          category_id=categorie["spesa"]))
    db.commit()
    risposta, _ = anteprima(client)
    conad = next(r for r in risposta.json()["righe"] if r["nome"] == "Conad Superstore Roma")
    assert (conad["messaggio"], conad["selezionata"]) == ("doppione", False)


def test_file_illeggibile(client, categorie, utente):
    risposta, _ = anteprima(client, b"<html>non un estratto</html>", "estratto.xls")
    assert (risposta.status_code, risposta.json()["detail"]) == (422, "non_riconosciuto")


def test_file_troppo_grande(client, categorie, utente):
    risposta, _ = anteprima(client, b"x" * (2 * 1024 * 1024 + 1))
    assert (risposta.status_code, risposta.json()["detail"]) == (413, "troppo_grande")


def test_solo_entrate(client, categorie, utente):
    #la lettera C dice "entrata": senza, una colonna tutta positiva sarebbe
    #l'elenco delle spese di una carta di credito
    solo_entrate = xlsx([["Data", "Descrizione", "Importo"], ["05/09/2026", "STIPENDIO", "1.500,00 C"],
                         ["07/09/2026", "INTERESSI", "0,10 C"]])
    risposta, _ = anteprima(client, solo_entrate)
    assert (risposta.status_code, risposta.json()["detail"]) == (422, "nessuna_uscita")


def test_valuta_diversa_dall_euro(client, db, categorie, utente):
    db.get(models.User, utente).currency = "GBP"
    db.commit()
    risposta, _ = anteprima(client)
    assert (risposta.status_code, risposta.json()["detail"]) == (422, "valuta")


def test_serve_il_login(client, categorie):
    risposta = client.post("/import/anteprima", files={"file": ("e.xlsx", ESTRATTO, TIPO_XLSX)})
    assert risposta.status_code == 401


# --- conferma e annullamento --------------------------------------------------

CODICE = "0b1c2d3e-0000-4000-8000-000000000001"


def conferma(client, righe, codice=CODICE):
    return client.post("/import/conferma", json={"codice": codice, "righe": righe},
                       headers={"X-Local-Date": OGGI})


def riga_ok(categoria_id, **altro):
    return {"data": "2026-09-02", "importo": 63.1, "descrizione": "Conad Superstore",
            "categoria_id": categoria_id, "testo_banca": "PAGAMENTO POS CONAD SUPERSTORE ROMA", **altro}


def test_conferma_salva_tutto(client, db, categorie, utente):
    risposta = conferma(client, [riga_ok(categorie["spesa"]),
                                 riga_ok(categorie["spesa"], importo=24.9, descrizione="Zalando")])
    assert risposta.status_code == 201
    assert risposta.json() == {"codice": CODICE, "importate": 2}
    spese = db.query(models.Expense).order_by(models.Expense.amount).all()
    assert [(s.description, s.amount, s.importazione_id) for s in spese] == [
        ("Zalando", 24.9, CODICE), ("Conad Superstore", 63.1, CODICE),
    ]
    assert spese[0].descrizione_banca == "PAGAMENTO POS CONAD SUPERSTORE ROMA"


def test_conferma_tutto_o_niente(client, db, categorie, utente):
    #una riga su un gruppo (non assegnabile) blocca anche quella buona
    risposta = conferma(client, [riga_ok(categorie["spesa"]), riga_ok(categorie["cibo"])])
    assert (risposta.status_code, risposta.json()["detail"]) == (422, "categoria")
    assert db.query(models.Expense).count() == 0


@pytest.mark.parametrize("modifica", [
    {"categoria_id": None},
    {"importo": 0},
    {"importo": -5},
    {"descrizione": ""},
])
def test_conferma_rifiuta_righe_non_valide(client, db, categorie, utente, modifica):
    risposta = conferma(client, [{**riga_ok(categorie["spesa"]), **modifica}])
    assert risposta.status_code == 422
    assert db.query(models.Expense).count() == 0


def test_conferma_rifiuta_date_future(client, db, categorie, utente):
    risposta = conferma(client, [riga_ok(categorie["spesa"], data="2026-10-11")])
    assert (risposta.status_code, risposta.json()["detail"]) == (422, "data_futura")


def test_conferma_rifiuta_troppe_righe(client, categorie, utente):
    risposta = conferma(client, [riga_ok(categorie["spesa"])] * 2001)
    assert risposta.status_code == 422


def test_annulla_cancella_solo_quel_caricamento(client, db, categorie, utente):
    conferma(client, [riga_ok(categorie["spesa"]), riga_ok(categorie["spesa"])])
    db.add(models.Expense(user_id=utente, description="A mano", amount=5, date=date(2026, 9, 2)))
    db.commit()
    risposta = client.delete(f"/import/{CODICE}")
    assert risposta.json() == {"cancellate": 2}
    assert [s.description for s in db.query(models.Expense).all()] == ["A mano"]


def test_annulla_non_tocca_le_spese_altrui(client, db, categorie, utente, make_user, login_as):
    conferma(client, [riga_ok(categorie["spesa"])])
    login_as(make_user(email="altro@example.com"))
    assert client.delete(f"/import/{CODICE}").status_code == 404
    assert db.query(models.Expense).count() == 1


# --- revisione finale ---------------------------------------------------------

def test_conferma_ripetuta_risponde_come_la_prima(client, db, categorie, utente):
    #la risposta della prima conferma si e' persa: la seconda non deve bloccare l'utente
    conferma(client, [riga_ok(categorie["spesa"]), riga_ok(categorie["spesa"])])
    risposta = conferma(client, [riga_ok(categorie["spesa"])])
    assert risposta.status_code == 201
    assert risposta.json() == {"codice": CODICE, "importate": 2}
    assert db.query(models.Expense).count() == 2


def test_anteprima_tronca_i_nomi_lunghi_e_salta_le_date_future(client, categorie, utente):
    lungo = "ADDEBITO SDD " + "ASSICURAZIONE " * 12
    contenuto = xlsx([["Data", "Descrizione", "Importo"], ["02/09/2026", lungo, "-10,00"],
                      ["20/10/2026", "PAGAMENTO POS CONAD", "-5,00"]])
    risposta, _ = anteprima(client, contenuto)
    righe = risposta.json()["righe"]
    assert len(righe) == 1
    assert len(righe[0]["nome"]) <= 100

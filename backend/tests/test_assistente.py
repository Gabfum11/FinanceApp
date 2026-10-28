"""Domande sulle proprie spese: instradamento, funzioni di calcolo, dialogo con il modello.

Groq non viene mai chiamato: il modello e' sostituito da risposte preparate,
cosi' si verifica cosa riceve e cosa fa il backend con le sue scelte.
"""
import json
from datetime import date
from types import SimpleNamespace
from unittest.mock import patch

import pytest

from app import models
from app.business_logic import categorization, conti_spese, domande, security

OGGI = date(2026, 10, 7)
ESTRAZIONE_FINTA = {
    "description": "Pizza", "amount": 15.0, "date": None,
    "category": None, "recurring": False, "frequency": None,
}


# --- dati di prova -----------------------------------------------------------

@pytest.fixture
def db(db_session):
    s = db_session()
    yield s
    s.close()


@pytest.fixture
def categorie(db):
    """Due gruppi con le loro sottocategorie, come nel database vero."""
    cibo = models.Category(name="Cibo")
    casa = models.Category(name="Casa")
    db.add_all([cibo, casa])
    db.flush()
    ristoranti = models.Category(name="Pranzi e cene", parent_id=cibo.id)
    alimentari = models.Category(name="Spesa alimentare", parent_id=cibo.id)
    bollette = models.Category(name="Bolletta energia", parent_id=casa.id)
    db.add_all([ristoranti, alimentari, bollette])
    db.commit()
    return {"ristoranti": ristoranti.id, "alimentari": alimentari.id, "bollette": bollette.id}


@pytest.fixture
def utente(db, make_user):
    return db.get(models.User, make_user(email="io@example.com", monthly_budget=500.0))


def spesa(db, utente_id, giorno, importo, categoria=None, descrizione="spesa"):
    db.add(models.Expense(user_id=utente_id, date=giorno, amount=importo,
                          category_id=categoria, description=descrizione))
    db.commit()


# --- spesa o domanda ---------------------------------------------------------

@pytest.mark.parametrize("testo", [
    "Quanto ho speso a settembre?",
    "quanto ho speso in ristoranti",
    "Dove spendo di più",
    "ho speso troppo questo mese?",
    "How much did I spend last month",
    "Mostrami le spese più alte",
    "spese di settembre",
    "ciao",
    "Quanto ho speso nel 2025",
    "Qual'è il totale di marzo 2026",
    "Quant'è il totale di marzo 2026",
    "Dammi le spese del 2025",
])
def test_riconosce_le_domande(testo):
    assert domande.sembra_una_domanda(testo)


@pytest.mark.parametrize("testo", [
    "Pizza 15 euro",
    "ho speso 20 euro al bar",
    "Spesa 40 euro ieri",
    "Palestra 50 euro al mese",
    "Groceries 40 yesterday",
    "spese 2026",
])
def test_le_spese_non_sono_domande(testo):
    #"spese 2026" e' una domanda, ma ha una cifra e niente "?": va all'estrazione,
    #che non la riconosce, e l'app suggerisce il punto interrogativo
    assert not domande.sembra_una_domanda(testo)


# --- funzioni di calcolo -----------------------------------------------------

class TestFunzioni:
    def test_conta_solo_le_spese_dell_utente(self, db, utente, make_user):
        altro = make_user(email="altro@example.com")
        spesa(db, utente.id, date(2026, 9, 3), 10.0)
        spesa(db, altro, date(2026, 9, 3), 999.0)
        r = conti_spese.totale_spese(db, utente, OGGI, "2026-09-01", "2026-09-30")
        assert r["totale"] == 10.0
        assert r["numero_spese"] == 1

    def test_il_periodo_include_gli_estremi(self, db, utente):
        spesa(db, utente.id, date(2026, 9, 1), 1.0)
        spesa(db, utente.id, date(2026, 9, 30), 2.0)
        spesa(db, utente.id, date(2026, 10, 1), 4.0)
        assert conti_spese.totale_spese(db, utente, OGGI, "2026-09-01", "2026-09-30")["totale"] == 3.0

    def test_un_gruppo_comprende_le_sue_sottocategorie(self, db, utente, categorie):
        spesa(db, utente.id, date(2026, 9, 3), 30.0, categorie["ristoranti"])
        spesa(db, utente.id, date(2026, 9, 4), 50.0, categorie["alimentari"])
        spesa(db, utente.id, date(2026, 9, 5), 80.0, categorie["bollette"])
        assert conti_spese.totale_spese(db, utente, OGGI, "2026-09-01", "2026-09-30", categoria="cibo")["totale"] == 80.0
        assert conti_spese.totale_spese(db, utente, OGGI, "2026-09-01", "2026-09-30",
                                    categoria="Pranzi e cene")["totale"] == 30.0
        #il modello a volte copia anche il gruppo, come nell'elenco che riceve
        assert conti_spese.totale_spese(db, utente, OGGI, "2026-09-01", "2026-09-30",
                                    categoria="Cibo: Pranzi e cene")["totale"] == 30.0

    def test_categoria_sconosciuta_elenca_i_nomi_validi(self, db, utente, categorie):
        r = conti_spese.esegui_strumento("totale_spese", json.dumps(
            {"da": "2026-09-01", "a": "2026-09-30", "categoria": "Restaurants"}), db, utente, OGGI)
        assert "Pranzi e cene" in r["errore"]

    def test_il_testo_cercato_non_e_un_jolly(self, db, utente):
        spesa(db, utente.id, date(2026, 9, 3), 10.0, descrizione="Conad")
        spesa(db, utente.id, date(2026, 9, 3), 20.0, descrizione="sconto 50%")
        assert conti_spese.totale_spese(db, utente, OGGI, "2026-09-01", "2026-09-30", testo="conad")["totale"] == 10.0
        assert conti_spese.totale_spese(db, utente, OGGI, "2026-09-01", "2026-09-30", testo="%")["totale"] == 20.0

    def test_il_testo_si_cerca_a_inizio_parola(self, db, utente):
        spesa(db, utente.id, date(2026, 9, 3), 30.0, descrizione="ENI Roma")
        spesa(db, utente.id, date(2026, 9, 4), 16.0, descrizione="Freni E Frizioni")
        spesa(db, utente.id, date(2026, 9, 5), 6.0, descrizione="biglietto Trenitalia")
        assert conti_spese.totale_spese(db, utente, OGGI, "2026-09-01", "2026-09-30", testo="eni")["totale"] == 30.0

    def test_il_testo_accetta_sinonimi(self, db, utente):
        spesa(db, utente.id, date(2026, 9, 3), 8.0, descrizione="Calcetto giovedi'")
        spesa(db, utente.id, date(2026, 9, 5), 10.0, descrizione="partita di calcio")
        spesa(db, utente.id, date(2026, 9, 6), 30.0, descrizione="Tennis")
        r = conti_spese.esegui_strumento("totale_spese", json.dumps(
            {"da": "2026-09-01", "a": "2026-09-30", "testo": ["calcio", "calcetto"]}), db, utente, OGGI)
        assert (r["totale"], r["numero_spese"]) == (18.0, 2)

    @pytest.mark.parametrize("parametri", [
        {"da": "settembre", "a": "2026-09-30"},
        {"da": "2026-09-30", "a": "2026-09-01"},
        {"da": "2000-01-01", "a": "2026-09-01"},
        {"da": "2026-09-01"},
    ])
    def test_parametri_sbagliati_tornano_al_modello(self, db, utente, parametri):
        r = conti_spese.esegui_strumento("totale_spese", json.dumps(parametri), db, utente, OGGI)
        assert "errore" in r

    def test_parametri_sconosciuti_o_null_sono_ignorati(self, db, utente):
        """Non c'e' un secondo giro per correggerli: vale il valore predefinito."""
        spesa(db, utente.id, date(2026, 9, 3), 10.0)
        r = conti_spese.esegui_strumento("elenco_spese", json.dumps(
            {"da": "2026-09-01", "a": "2026-09-30", "ordina": "importo", "categoria": None}), db, utente, OGGI)
        assert r["numero_spese"] == 1

    def test_il_modello_non_sceglie_utente_ne_giorno(self, db, utente, make_user):
        altro = make_user(email="altro@example.com")
        spesa(db, altro, date(2026, 10, 2), 99.0)
        r = conti_spese.esegui_strumento("stato_budget", json.dumps(
            {"utente": altro, "giorno": "2020-01-01"}), db, utente, OGGI)
        assert r["speso"] == 0
        assert r["inizio_ciclo"] == "2026-10-01"

    def test_totali_per_periodi(self, db, utente, categorie):
        spesa(db, utente.id, date(2026, 9, 3), 10.0, categorie["ristoranti"])
        spesa(db, utente.id, date(2026, 9, 20), 30.0, categorie["ristoranti"])
        spesa(db, utente.id, date(2026, 9, 21), 99.0, categorie["bollette"])
        r = conti_spese.esegui_strumento("totali_per_periodi", json.dumps({
            "periodi": [{"da": "2026-09-01", "a": "2026-09-15"}, {"da": "2026-09-16", "a": "2026-09-30"}],
            "categoria": "Cibo",
        }), db, utente, OGGI)
        assert [p["totale"] for p in r["periodi"]] == [10.0, 30.0]

    @pytest.mark.parametrize("periodi", [[], "settembre", [{"da": "x", "a": "y"}], ["2026-09"]])
    def test_totali_per_periodi_non_validi(self, db, utente, periodi):
        r = conti_spese.esegui_strumento("totali_per_periodi", json.dumps({"periodi": periodi}), db, utente, OGGI)
        assert "errore" in r

    #OGGI e' mercoledi' 7 ottobre 2026
    @pytest.mark.parametrize("periodo, atteso", [
        ({"unita": "weekend", "indietro": 1}, ("2026-10-03", "2026-10-04")),
        ({"unita": "weekend"}, ("2026-10-10", "2026-10-11")),
        ({"unita": "settimana", "indietro": 1}, ("2026-09-28", "2026-10-04")),
        ({"unita": "giorno", "indietro": 1}, ("2026-10-06", "2026-10-06")),
        ({"unita": "mese", "indietro": 1}, ("2026-09-01", "2026-09-30")),
        ({"unita": "mese", "indietro": 10}, ("2025-12-01", "2025-12-31")),
        ({"unita": "trimestre", "indietro": 1}, ("2026-07-01", "2026-09-30")),
        ({"unita": "anno", "indietro": 1}, ("2025-01-01", "2025-12-31")),
        ({"ultimi": 3, "unita": "mese"}, ("2026-07-08", "2026-10-07")),
        ({"ultimi": 10, "unita": "giorno"}, ("2026-09-28", "2026-10-07")),
        ({"mese": "2026-02"}, ("2026-02-01", "2026-02-28")),
        ({"anno": 2025}, ("2025-01-01", "2025-12-31")),
        #settembre ha 30 giorni: il 31 vale l'ultimo, invece di far sparire il mese
        ({"da": "2026-09-01", "a": "2026-09-31"}, ("2026-09-01", "2026-09-30")),
    ])
    def test_il_periodo_lo_calcola_il_server(self, db, utente, periodo, atteso):
        r = conti_spese.esegui_strumento("totale_spese", json.dumps({"periodo": periodo}), db, utente, OGGI)
        assert (r["da"], r["a"]) == atteso

    @pytest.mark.parametrize("periodo", [
        {"unita": "secolo"}, {"ultimi": 0, "unita": "mese"}, {"ultimi": 2, "unita": "weekend"},
        {"mese": "settembre"}, {"unita": "mese", "indietro": "uno"}, {}, "settembre",
    ])
    def test_periodi_non_validi(self, db, utente, periodo):
        r = conti_spese.esegui_strumento("totale_spese", json.dumps({"periodo": periodo}), db, utente, OGGI)
        assert "errore" in r

    def test_totali_per_periodi_descritti(self, db, utente):
        spesa(db, utente.id, date(2026, 8, 3), 25.0)
        spesa(db, utente.id, date(2026, 9, 3), 40.0)
        r = conti_spese.esegui_strumento("totali_per_periodi", json.dumps(
            {"periodi": [{"mese": "2026-08"}, {"unita": "mese", "indietro": 1}]}), db, utente, OGGI)
        assert [p["totale"] for p in r["periodi"]] == [25.0, 40.0]
        f = conti_spese.fonte([("totale_spese", json.dumps({"periodo": {"unita": "mese", "indietro": 1}}))],
                              db, utente, OGGI)
        assert (f["da"], f["a"], f["numero_spese"]) == ("2026-09-01", "2026-09-30", 1)

    def test_funzione_inesistente(self, db, utente):
        assert "errore" in conti_spese.esegui_strumento("cancella_tutto", "{}", db, utente, OGGI)

    def test_per_categoria_raggruppa_e_ordina(self, db, utente, categorie):
        spesa(db, utente.id, date(2026, 9, 3), 30.0, categorie["ristoranti"])
        spesa(db, utente.id, date(2026, 9, 4), 50.0, categorie["alimentari"])
        spesa(db, utente.id, date(2026, 9, 5), 60.0, categorie["bollette"])
        spesa(db, utente.id, date(2026, 9, 6), 5.0)
        r = conti_spese.spese_per_categoria(db, utente, OGGI, "2026-09-01", "2026-09-30")
        assert [g["gruppo"] for g in r["gruppi"]] == ["Cibo", "Casa", "Senza categoria"]
        assert r["gruppi"][0]["totale"] == 80.0
        assert r["totale"] == 145.0
        #la sottocategoria piu' alta e' Bollette (60), anche se il gruppo piu' alto e' Cibo
        assert r["sottocategoria_con_la_spesa_piu_alta"] == {"categoria": "Bolletta energia", "totale": 60.0}

    def test_il_risultato_dice_quale_filtro_e_stato_usato(self, db, utente, categorie):
        spesa(db, utente.id, date(2026, 9, 3), 30.0, categorie["ristoranti"])
        r = conti_spese.totale_spese(db, utente, OGGI, "2026-09-01", "2026-09-30", categoria="Pranzi e cene")
        assert r["categoria"] == "Pranzi e cene"
        assert conti_spese.totale_spese(db, utente, OGGI, "2026-09-01", "2026-09-30")["categoria"] == "tutte"

    def test_elenco_ha_un_tetto(self, db, utente):
        for i in range(30):
            spesa(db, utente.id, date(2026, 9, 1), float(i))
        r = conti_spese.elenco_spese(db, utente, OGGI, "2026-09-01", "2026-09-30", limite=100)
        assert len(r["spese"]) == conti_spese.MAX_ELENCO
        assert r["spese"][0]["importo"] == 29.0
        assert r["numero_spese"] == 30

    def test_elenco_dalla_spesa_piu_piccola(self, db, utente):
        for importo in (80.0, 2.5, 30.0):
            spesa(db, utente.id, date(2026, 9, 1), importo)
        r = conti_spese.elenco_spese(db, utente, OGGI, "2026-09-01", "2026-09-30", ordine="importo_crescente", limite=1)
        assert [s["importo"] for s in r["spese"]] == [2.5]

    def test_i_mesi_senza_spese_valgono_zero(self, db, utente):
        spesa(db, utente.id, date(2026, 7, 10), 10.0)
        spesa(db, utente.id, date(2026, 9, 10), 20.0)
        r = conti_spese.totali_mensili(db, utente, OGGI, "2026-07-01", "2026-09-30")
        assert r["categoria"] == "tutte"
        assert r["mesi"] == [
            {"mese": "2026-07", "totale": 10.0},
            {"mese": "2026-08", "totale": 0.0},
            {"mese": "2026-09", "totale": 20.0},
        ]

    def test_i_mesi_tagliati_dal_periodo_lo_dicono(self, db, utente):
        spesa(db, utente.id, date(2026, 7, 20), 10.0)
        r = conti_spese.totali_mensili(db, utente, OGGI, "2026-07-15", "2026-09-10")
        assert (r["da"], r["a"]) == ("2026-07-15", "2026-09-10")
        assert r["mesi"] == [
            {"mese": "2026-07", "dal": "2026-07-15", "totale": 10.0},
            {"mese": "2026-08", "totale": 0.0},
            {"mese": "2026-09", "al": "2026-09-10", "totale": 0.0},
        ]

    def test_totali_mensili_con_testo(self, db, utente):
        spesa(db, utente.id, date(2026, 8, 3), 40.0, descrizione="Benzina Eni")
        spesa(db, utente.id, date(2026, 8, 4), 99.0, descrizione="Cena")
        r = conti_spese.esegui_strumento("totali_mensili", json.dumps(
            {"da": "2026-08-01", "a": "2026-08-31", "testo": ["benzina"]}), db, utente, OGGI)
        assert r["mesi"] == [{"mese": "2026-08", "totale": 40.0}]
        assert r["testo_cercato"] == ["benzina"]

    def test_i_periodi_oltre_il_tetto_sono_dichiarati(self, db, utente):
        periodi = [{"da": "2026-09-01", "a": "2026-09-01"}] * (conti_spese.MAX_PERIODI + 2)
        r = conti_spese.esegui_strumento("totali_per_periodi", json.dumps({"periodi": periodi}), db, utente, OGGI)
        assert len(r["periodi"]) == conti_spese.MAX_PERIODI
        assert r["periodi_chiesti_ma_esclusi"] == 2

    def test_le_sottocategorie_oltre_le_cinque_tornano_nel_totale(self, db, utente):
        gruppo = models.Category(name="Svago")
        db.add(gruppo)
        db.flush()
        for i in range(7):
            figlia = models.Category(name=f"Svago {i}", parent_id=gruppo.id)
            db.add(figlia)
            db.flush()
            spesa(db, utente.id, date(2026, 9, 3), 10.0 + i, figlia.id)
        g = conti_spese.spese_per_categoria(db, utente, OGGI, "2026-09-01", "2026-09-30")["gruppi"][0]
        assert len(g["categorie"]) == 5
        assert g["altre_sottocategorie"] == {"numero": 2, "totale": 21.0}
        assert sum(c["totale"] for c in g["categorie"]) + g["altre_sottocategorie"]["totale"] == g["totale"]

    def test_la_fonte_rilegge_le_spese_con_gli_stessi_filtri(self, db, utente, make_user):
        altro = make_user(email="altro@example.com")
        spesa(db, utente.id, date(2026, 9, 3), 40.0, descrizione="Benzina Eni")
        spesa(db, utente.id, date(2026, 9, 9), 30.0, descrizione="Benzina Q8")
        spesa(db, utente.id, date(2026, 9, 5), 99.0, descrizione="Cena")
        spesa(db, altro, date(2026, 9, 4), 77.0, descrizione="Benzina")
        settembre = {"da": "2026-09-01", "a": "2026-09-30", "testo": ["benzina"]}
        f = conti_spese.fonte([
            ("totale_spese", json.dumps(settembre)),
            #stesso periodo in un'altra funzione: le spese contano una volta
            ("elenco_spese", json.dumps(settembre)),
            ("stato_budget", "{}"),
        ], db, utente, OGGI)
        assert f["numero_spese"] == 2
        assert (f["da"], f["a"], f["testo_cercato"]) == ("2026-09-01", "2026-09-30", ["benzina"])
        assert [s["importo"] for s in f["spese"]] == [40.0, 30.0]

    def test_la_fonte_di_piu_periodi_li_copre_tutti(self, db, utente):
        spesa(db, utente.id, date(2026, 8, 3), 25.0)
        spesa(db, utente.id, date(2026, 9, 3), 40.0)
        f = conti_spese.fonte([("totali_per_periodi", json.dumps({"periodi": [
            {"da": "2026-08-01", "a": "2026-08-31"}, {"da": "2026-09-01", "a": "2026-09-30"}]}))], db, utente, OGGI)
        assert (f["da"], f["a"], f["numero_spese"]) == ("2026-08-01", "2026-09-30", 2)

    def test_la_fonte_manda_piu_spese_dell_elenco(self, db, utente):
        for i in range(conti_spese.MAX_ELENCO + 5):
            spesa(db, utente.id, date(2026, 9, 1), 10.0 + i)
        f = conti_spese.fonte([("totale_spese", json.dumps({"da": "2026-09-01", "a": "2026-09-30"}))], db, utente, OGGI)
        assert len(f["spese"]) == f["numero_spese"] == conti_spese.MAX_ELENCO + 5

    @pytest.mark.parametrize("chiamate", [
        [("stato_budget", "{}"), ("abbonamenti_attivi", "{}")],
        [("totale_spese", json.dumps({"da": "settembre", "a": "2026-09-30"}))],
        [("totale_spese", "non json")],
    ])
    def test_niente_fonte_senza_spese_lette(self, db, utente, chiamate):
        assert conti_spese.fonte(chiamate, db, utente, OGGI) is None

    def test_stato_budget(self, db, utente):
        spesa(db, utente.id, date(2026, 10, 2), 120.0)
        spesa(db, utente.id, date(2026, 9, 30), 999.0)
        r = conti_spese.stato_budget(db, utente, OGGI)
        assert r["speso"] == 120.0
        assert r["rimanente"] == 380.0
        assert r["giorni_rimanenti"] == 25

    def test_abbonamenti_in_altra_valuta_non_si_sommano(self, db, utente):
        db.add_all([
            models.Subscriptions(user_id=utente.id, description="Palestra", amount=50.0,
                                 frequency="monthly", next_date=date(2026, 11, 1)),
            models.Subscriptions(user_id=utente.id, description="Dominio", amount=12.0,
                                 frequency="yearly", next_date=date(2027, 1, 1)),
            models.Subscriptions(user_id=utente.id, description="Server", amount=5.0, currency="USD",
                                 frequency="monthly", next_date=date(2026, 11, 1)),
            models.Subscriptions(user_id=utente.id, description="Disdetto", amount=99.0,
                                 frequency="monthly", next_date=date(2026, 11, 1), is_active=False),
        ])
        db.commit()
        r = conti_spese.abbonamenti_attivi(db, utente, OGGI)
        assert len(r["abbonamenti"]) == 3
        assert r["costo_mensile_stimato"] == 51.0
        assert r["abbonamenti_in_altre_valute_esclusi_dal_totale"] == 1


# --- dialogo con il modello --------------------------------------------------

def chiamata(nome, argomenti, id_="c1"):
    return SimpleNamespace(id=id_, function=SimpleNamespace(name=nome, arguments=json.dumps(argomenti)))


def risposta_modello(testo=None, chiamate=None):
    return SimpleNamespace(content=testo, tool_calls=chiamate)


def dati_inviati(messaggi) -> str:
    """I risultati delle funzioni, come arrivano al modello nella seconda richiesta."""
    return messaggi[0]["content"].split(domande.INIZIO_DATI, 1)[1]


class TestDialogo:
    def test_il_risultato_della_funzione_torna_al_modello(self, db, utente):
        spesa(db, utente.id, date(2026, 9, 3), 42.5)
        ricevuti = []

        def modello(messaggi, con_strumenti):
            ricevuti.append(list(messaggi))
            if len(ricevuti) == 1:
                return risposta_modello(chiamate=[chiamata("totale_spese", {"da": "2026-09-01", "a": "2026-09-30"})])
            return risposta_modello("A settembre hai speso 42,50 €.")

        quota = []
        with patch.object(domande, "_chiama_modello", modello):
            testo = domande.rispondi_a_domanda("quanto a settembre?", db, utente, OGGI, lambda: quota.append(1))

        assert testo["testo"] == "A settembre hai speso 42,50 €."
        assert testo["fonte"]["numero_spese"] == 1
        assert "totale: 42.5" in dati_inviati(ricevuti[1])
        assert len(quota) == 2, "ogni richiesta a Groq passa dalla quota"

    def test_le_istruzioni_dicono_oggi_e_valuta(self, db, utente, categorie):
        ricevuti = []

        def modello(messaggi, con_strumenti):
            ricevuti.append(messaggi[0]["content"])
            return risposta_modello("ok")

        with patch.object(domande, "_chiama_modello", modello):
            domande.rispondi_a_domanda("quanto?", db, utente, OGGI, lambda: None)
        assert "2026-10-07" in ricevuti[0]
        assert "EUR" in ricevuti[0]
        #con un solo giro il modello non puo' sbagliare un nome e riprovare:
        #le sottocategorie le deve avere subito, con il loro gruppo
        assert "Cibo: Pranzi e cene, Spesa alimentare" in ricevuti[0]

    def test_al_massimo_due_richieste_a_groq(self, db, utente):
        """Anche se il modello volesse altre funzioni, la seconda richiesta deve rispondere."""
        giri = []

        def modello(messaggi, con_strumenti):
            giri.append(con_strumenti)
            if con_strumenti:
                return risposta_modello(chiamate=[chiamata("stato_budget", {})])
            return risposta_modello("Ecco il budget.")

        with patch.object(domande, "_chiama_modello", modello):
            testo = domande.rispondi_a_domanda("budget?", db, utente, OGGI, lambda: None)
        #il budget non conta spese: niente fonte da mostrare
        assert testo == {"testo": "Ecco il budget.", "fonte": None}
        assert giri == [True, False]

    def test_piu_funzioni_nello_stesso_giro(self, db, utente):
        """Un confronto chiede i due mesi insieme: i risultati arrivano entrambi."""
        spesa(db, utente.id, date(2026, 8, 3), 25.0)
        spesa(db, utente.id, date(2026, 9, 3), 40.0)
        ricevuti = []

        def modello(messaggi, con_strumenti):
            ricevuti.append(list(messaggi))
            if con_strumenti:
                return risposta_modello(chiamate=[
                    chiamata("totale_spese", {"da": "2026-08-01", "a": "2026-08-31"}, "c1"),
                    chiamata("totale_spese", {"da": "2026-09-01", "a": "2026-09-30"}, "c2"),
                ])
            return risposta_modello("Agosto 25 €, settembre 40 €.")

        with patch.object(domande, "_chiama_modello", modello):
            domande.rispondi_a_domanda("confronta agosto e settembre", db, utente, OGGI, lambda: None)
        dati = dati_inviati(ricevuti[1])
        assert "totale: 25.0" in dati and "totale: 40.0" in dati
        assert len(ricevuti) == 2

    def test_la_seconda_richiesta_non_contiene_chiamate_di_funzione(self, db, utente):
        """Vedendole, il modello prova a chiamarne un'altra e Groq rifiuta la richiesta."""
        ricevuti = []

        def modello(messaggi, con_strumenti):
            ricevuti.append(list(messaggi))
            if con_strumenti:
                return risposta_modello(chiamate=[chiamata("stato_budget", {})])
            return risposta_modello("ok")

        with patch.object(domande, "_chiama_modello", modello):
            domande.rispondi_a_domanda("budget?", db, utente, OGGI, lambda: None)
        assert [m["role"] for m in ricevuti[1]] == ["system", "user"]
        #nemmeno il nome della funzione: vedendolo, il modello prova a richiamarla
        assert "stato_budget" not in ricevuti[1][0]["content"]

    def test_i_dati_arrivano_come_testo_e_non_json(self, db, utente):
        """Ricevendo JSON, il modello a volte rispondeva in JSON anche lui."""
        ricevuti = []

        def modello(messaggi, con_strumenti):
            ricevuti.append(list(messaggi))
            if con_strumenti:
                return risposta_modello(chiamate=[chiamata("abbonamenti_attivi", {})])
            return risposta_modello("ok")

        with patch.object(domande, "_chiama_modello", modello):
            domande.rispondi_a_domanda("abbonamenti?", db, utente, OGGI, lambda: None)
        dati = dati_inviati(ricevuti[1])
        assert "{" not in dati and '"' not in dati
        assert "abbonamenti: nessuno" in dati

    def test_una_risposta_in_json_non_arriva_in_chat(self, db, utente):
        with patch.object(domande, "_chiama_modello", return_value=risposta_modello('{"speso": 60}')):
            assert domande.rispondi_a_domanda("budget?", db, utente, OGGI, lambda: None) is None

    def test_risponde_nella_lingua_dell_app(self, db, make_user):
        inglese = db.get(models.User, make_user(email="en@example.com", language="en"))
        ricevuti = []

        def modello(messaggi, con_strumenti):
            ricevuti.append(messaggi[0]["content"])
            return risposta_modello("ok")

        with patch.object(domande, "_chiama_modello", modello):
            domande.rispondi_a_domanda("quanto ho speso?", db, inglese, OGGI, lambda: None)
        assert "in English" in ricevuti[0]

    def test_niente_grassetto_markdown(self, db, utente):
        with patch.object(domande, "_chiama_modello", return_value=risposta_modello("Hai speso **10 €**.")):
            assert domande.rispondi_a_domanda("quanto?", db, utente, OGGI, lambda: None) == {"testo": "Hai speso 10 €.", "fonte": None}

    def test_quota_esaurita_ferma_il_dialogo(self, db, utente):
        def quota():
            raise categorization.ServizioOccupato()

        with patch.object(domande, "_chiama_modello") as modello:
            with pytest.raises(categorization.ServizioOccupato):
                domande.rispondi_a_domanda("quanto?", db, utente, OGGI, quota)
        modello.assert_not_called()

    def test_una_risposta_troncata_non_arriva_in_chat(self, db, utente):
        troncata = SimpleNamespace(choices=[SimpleNamespace(
            finish_reason="length", message=risposta_modello("Il 4 settembre hai acquist"))])
        with patch.object(categorization.groq_client.chat.completions, "create", return_value=troncata):
            assert domande.rispondi_a_domanda("che spese?", db, utente, OGGI, lambda: None) is None

    def test_lo_scambio_precedente_arriva_a_entrambe_le_richieste(self, db, utente):
        ricevuti = []

        def modello(messaggi, con_strumenti):
            ricevuti.append(list(messaggi))
            if con_strumenti:
                return risposta_modello(chiamate=[chiamata("stato_budget", {})])
            return risposta_modello("ok")

        precedente = {"domanda": "Quanto ho speso di benzina?", "risposta": "A ottobre 0,00 €."}
        with patch.object(domande, "_chiama_modello", modello):
            domande.rispondi_a_domanda("Il mese scorso", db, utente, OGGI, lambda: None, precedente)
        for messaggi in ricevuti:
            assert messaggi[1:] == [
                {"role": "user", "content": "Quanto ho speso di benzina?"},
                {"role": "assistant", "content": "A ottobre 0,00 €."},
                {"role": "user", "content": "Il mese scorso"},
            ]

    def test_un_guasto_del_modello_non_rompe_l_endpoint(self, db, utente):
        with patch.object(domande, "_chiama_modello", side_effect=RuntimeError("giu'")):
            assert domande.rispondi_a_domanda("quanto?", db, utente, OGGI, lambda: None) is None


# --- endpoint ----------------------------------------------------------------

RISPOSTA = {"testo": "Hai speso 10 €.", "fonte": None}


def invia(client, testo, token="Bearer tok"):
    return client.post("/assistant/message", json={"text": testo}, headers={"Authorization": token})


@pytest.fixture
def connesso(make_user, login_as, make_category):
    make_category(name="Altro")
    user_id = make_user(email="chat@example.com")
    login_as(user_id)
    return user_id


class TestEndpoint:
    def test_una_spesa_diventa_una_proposta(self, client, connesso):
        with patch("app.business_logic.categorization.extract_expense_from_text", return_value=ESTRAZIONE_FINTA), \
             patch.object(domande, "rispondi_a_domanda") as risposta:
            r = invia(client, "Pizza 15 euro")
        assert r.status_code == 200
        assert r.json()["tipo"] == "spesa"
        assert r.json()["spesa"]["amount"] == 15.0
        risposta.assert_not_called()

    def test_una_domanda_non_passa_dall_estrazione(self, client, connesso):
        with patch("app.business_logic.categorization.extract_expense_from_text") as estrazione, \
             patch.object(domande, "rispondi_a_domanda", return_value=RISPOSTA):
            r = invia(client, "Quanto ho speso?")
        assert r.json() == {"tipo": "risposta", **RISPOSTA}
        estrazione.assert_not_called()

    def test_senza_cifre_va_alle_domande_senza_estrazione(self, client, connesso):
        with patch("app.business_logic.categorization.extract_expense_from_text") as estrazione, \
             patch.object(domande, "rispondi_a_domanda", return_value=RISPOSTA) as risposta:
            r = invia(client, "spese di settembre")
        assert r.json()["tipo"] == "risposta"
        risposta.assert_called_once()
        estrazione.assert_not_called()

    def test_una_spesa_non_riconosciuta_non_riprova_come_domanda(self, client, connesso):
        """Riprovare costerebbe una terza richiesta a Groq."""
        with patch("app.business_logic.categorization.extract_expense_from_text", return_value=None), \
             patch.object(domande, "rispondi_a_domanda") as risposta:
            r = invia(client, "spese 2026")
        assert r.status_code == 422
        risposta.assert_not_called()

    def test_nessuna_risposta_da_422(self, client, connesso):
        with patch.object(domande, "rispondi_a_domanda", return_value=None):
            assert invia(client, "Quanto ho speso?").status_code == 422

    def test_groq_saturo_da_503(self, client, connesso):
        with patch.object(domande, "rispondi_a_domanda", side_effect=categorization.ServizioOccupato()):
            assert invia(client, "Quanto ho speso?").status_code == 503

    def test_lo_scambio_precedente_passa_alla_domanda(self, client, connesso):
        with patch.object(domande, "rispondi_a_domanda", return_value=RISPOSTA) as risposta:
            client.post("/assistant/message", headers={"Authorization": "Bearer tok"}, json={
                "text": "Quali sono?",
                "precedente": {"domanda": " Spese di settembre ", "risposta": "x" * 2000},
            })
        assert risposta.call_args.args[-1] == {"domanda": "Spese di settembre", "risposta": "x" * 1000}

    @pytest.mark.parametrize("precedente", [None, "testo", {"domanda": "a"}, {"domanda": 1, "risposta": "b"},
                                            {"domanda": " ", "risposta": "b"}])
    def test_uno_scambio_precedente_non_valido_viene_ignorato(self, client, connesso, precedente):
        with patch.object(domande, "rispondi_a_domanda", return_value=RISPOSTA) as risposta:
            r = client.post("/assistant/message", headers={"Authorization": "Bearer tok"},
                            json={"text": "Quali sono?", "precedente": precedente})
        assert r.status_code == 200
        assert risposta.call_args.args[-1] is None

    @pytest.mark.parametrize("testo", ["", "   ", "x" * 501])
    def test_messaggio_vuoto_o_troppo_lungo(self, client, connesso, testo):
        with patch.object(domande, "rispondi_a_domanda") as risposta:
            assert invia(client, testo).status_code == 422
        risposta.assert_not_called()


# --- quota di Groq condivisa -------------------------------------------------

@pytest.fixture
def limiter_attivo():
    from app.main import app

    app.state.limiter.enabled = True
    app.state.limiter.reset()
    yield
    app.state.limiter.enabled = False


def token_di(make_user, login_as, email):
    user_id = make_user(email=email)
    login_as(user_id)
    return "Bearer " + security.create_access_token({"sub": str(user_id), "ver": 0})


class TestQuotaCondivisa:
    def test_il_tetto_globale_vale_per_tutti_gli_utenti(self, client, make_user, login_as,
                                                         make_category, limiter_attivo):
        make_category(name="Altro")
        codici = []
        with patch("app.business_logic.categorization.extract_expense_from_text", return_value=ESTRAZIONE_FINTA):
            for i in range(2):
                token = token_di(make_user, login_as, f"vecchia{i}@example.com")
                for _ in range(4):
                    codici.append(invia(client, "Pizza 15", token).status_code)
            token = token_di(make_user, login_as, "nuova@example.com")
            codici.append(invia(client, "Pizza 15", token).status_code)
        assert codici == [200] * 8 + [429]

    def test_le_chiamate_in_piu_di_una_domanda_consumano_il_tetto(self, client, make_user, login_as,
                                                                   make_category, limiter_attivo):
        """Una domanda da due richieste a Groq, con un solo posto libero: la seconda non parte."""
        make_category(name="Altro")
        with patch("app.business_logic.categorization.extract_expense_from_text", return_value=ESTRAZIONE_FINTA):
            for i in range(2):
                token = token_di(make_user, login_as, f"riempi{i}@example.com")
                for _ in range(4 - i):
                    assert invia(client, "Pizza 15", token).status_code == 200

        richieste = []

        def modello(messaggi, con_strumenti):
            richieste.append(1)
            return risposta_modello(chiamate=[chiamata("stato_budget", {})])

        token = token_di(make_user, login_as, "domanda@example.com")
        with patch.object(domande, "_chiama_modello", modello):
            r = invia(client, "Come va il budget?", token)
        assert r.status_code == 503
        assert len(richieste) == 1


class TestParoleChiave:
    """Senza categoria dal modello si usano le parole chiave, come parole intere."""

    @pytest.fixture
    def bar(self, db_session, connesso):
        db = db_session()
        cibo = models.Category(name="Cibo")
        db.add(cibo)
        db.flush()
        db.add(models.Category(name="Bar e caffè", parent_id=cibo.id, keywords="bar,caffè"))
        db.commit()
        db.close()

    @pytest.mark.parametrize("descrizione,categoria", [("Barbiere", "Altro"), ("Caffè al bar", "Bar e caffè")])
    def test_parola_intera(self, client, bar, descrizione, categoria):
        estratta = {**ESTRAZIONE_FINTA, "description": descrizione}
        with patch("app.business_logic.categorization.extract_expense_from_text", return_value=estratta):
            r = invia(client, f"{descrizione} 15")
        assert r.json()["spesa"]["category_name"] == categoria

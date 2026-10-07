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
from app.business_logic import categorization, domande, security

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
])
def test_riconosce_le_domande(testo):
    assert domande.sembra_una_domanda(testo)


@pytest.mark.parametrize("testo", [
    "Pizza 15 euro",
    "ho speso 20 euro al bar",
    "Spesa 40 euro ieri",
    "Palestra 50 euro al mese",
    "Groceries 40 yesterday",
])
def test_le_spese_non_sono_domande(testo):
    assert not domande.sembra_una_domanda(testo)


# --- funzioni di calcolo -----------------------------------------------------

class TestFunzioni:
    def test_conta_solo_le_spese_dell_utente(self, db, utente, make_user):
        altro = make_user(email="altro@example.com")
        spesa(db, utente.id, date(2026, 9, 3), 10.0)
        spesa(db, altro, date(2026, 9, 3), 999.0)
        r = domande.totale_spese(db, utente, OGGI, "2026-09-01", "2026-09-30")
        assert r["totale"] == 10.0
        assert r["numero_spese"] == 1

    def test_il_periodo_include_gli_estremi(self, db, utente):
        spesa(db, utente.id, date(2026, 9, 1), 1.0)
        spesa(db, utente.id, date(2026, 9, 30), 2.0)
        spesa(db, utente.id, date(2026, 10, 1), 4.0)
        assert domande.totale_spese(db, utente, OGGI, "2026-09-01", "2026-09-30")["totale"] == 3.0

    def test_un_gruppo_comprende_le_sue_sottocategorie(self, db, utente, categorie):
        spesa(db, utente.id, date(2026, 9, 3), 30.0, categorie["ristoranti"])
        spesa(db, utente.id, date(2026, 9, 4), 50.0, categorie["alimentari"])
        spesa(db, utente.id, date(2026, 9, 5), 80.0, categorie["bollette"])
        assert domande.totale_spese(db, utente, OGGI, "2026-09-01", "2026-09-30", categoria="cibo")["totale"] == 80.0
        assert domande.totale_spese(db, utente, OGGI, "2026-09-01", "2026-09-30",
                                    categoria="Pranzi e cene")["totale"] == 30.0

    def test_categoria_sconosciuta_elenca_i_nomi_validi(self, db, utente, categorie):
        r = domande.esegui_strumento("totale_spese", json.dumps(
            {"da": "2026-09-01", "a": "2026-09-30", "categoria": "Restaurants"}), db, utente, OGGI)
        assert "Pranzi e cene" in r["errore"]

    def test_il_testo_cercato_non_e_un_jolly(self, db, utente):
        spesa(db, utente.id, date(2026, 9, 3), 10.0, descrizione="Conad")
        spesa(db, utente.id, date(2026, 9, 3), 20.0, descrizione="sconto 50%")
        assert domande.totale_spese(db, utente, OGGI, "2026-09-01", "2026-09-30", testo="conad")["totale"] == 10.0
        assert domande.totale_spese(db, utente, OGGI, "2026-09-01", "2026-09-30", testo="%")["totale"] == 20.0

    @pytest.mark.parametrize("parametri", [
        {"da": "settembre", "a": "2026-09-30"},
        {"da": "2026-09-30", "a": "2026-09-01"},
        {"da": "2000-01-01", "a": "2026-09-01"},
        {"da": "2026-09-01"},
        {"da": "2026-09-01", "a": "2026-09-30", "giorno": "2020-01-01"},
    ])
    def test_parametri_sbagliati_tornano_al_modello(self, db, utente, parametri):
        r = domande.esegui_strumento("totale_spese", json.dumps(parametri), db, utente, OGGI)
        assert "errore" in r

    def test_funzione_inesistente(self, db, utente):
        assert "errore" in domande.esegui_strumento("cancella_tutto", "{}", db, utente, OGGI)

    def test_per_categoria_raggruppa_e_ordina(self, db, utente, categorie):
        spesa(db, utente.id, date(2026, 9, 3), 30.0, categorie["ristoranti"])
        spesa(db, utente.id, date(2026, 9, 4), 50.0, categorie["alimentari"])
        spesa(db, utente.id, date(2026, 9, 5), 60.0, categorie["bollette"])
        spesa(db, utente.id, date(2026, 9, 6), 5.0)
        r = domande.spese_per_categoria(db, utente, OGGI, "2026-09-01", "2026-09-30")
        assert [g["gruppo"] for g in r["gruppi"]] == ["Cibo", "Casa", "Senza categoria"]
        assert r["gruppi"][0]["totale"] == 80.0
        assert r["totale"] == 145.0

    def test_elenco_ha_un_tetto(self, db, utente):
        for i in range(30):
            spesa(db, utente.id, date(2026, 9, 1), float(i))
        r = domande.elenco_spese(db, utente, OGGI, "2026-09-01", "2026-09-30", limite=100)
        assert len(r["spese"]) == domande.MAX_ELENCO
        assert r["spese"][0]["importo"] == 29.0
        assert r["numero_spese"] == 30

    def test_i_mesi_senza_spese_valgono_zero(self, db, utente):
        spesa(db, utente.id, date(2026, 7, 10), 10.0)
        spesa(db, utente.id, date(2026, 9, 10), 20.0)
        r = domande.totali_mensili(db, utente, OGGI, "2026-07-01", "2026-09-30")
        assert r["mesi"] == [
            {"mese": "2026-07", "totale": 10.0},
            {"mese": "2026-08", "totale": 0.0},
            {"mese": "2026-09", "totale": 20.0},
        ]

    def test_stato_budget(self, db, utente):
        spesa(db, utente.id, date(2026, 10, 2), 120.0)
        spesa(db, utente.id, date(2026, 9, 30), 999.0)
        r = domande.stato_budget(db, utente, OGGI)
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
        r = domande.abbonamenti_attivi(db, utente, OGGI)
        assert len(r["abbonamenti"]) == 3
        assert r["costo_mensile_stimato"] == 51.0
        assert r["abbonamenti_in_altre_valute_esclusi_dal_totale"] == 1


# --- dialogo con il modello --------------------------------------------------

def chiamata(nome, argomenti, id_="c1"):
    return SimpleNamespace(id=id_, function=SimpleNamespace(name=nome, arguments=json.dumps(argomenti)))


def risposta_modello(testo=None, chiamate=None):
    return SimpleNamespace(content=testo, tool_calls=chiamate)


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

        assert testo == "A settembre hai speso 42,50 €."
        risultato = json.loads(ricevuti[1][-1]["content"])
        assert risultato["totale"] == 42.5
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
        assert "Cibo" in ricevuti[0] and "Pranzi e cene" not in ricevuti[0]

    def test_dopo_l_ultimo_giro_deve_rispondere(self, db, utente):
        giri = []

        def modello(messaggi, con_strumenti):
            giri.append(con_strumenti)
            if con_strumenti:
                return risposta_modello(chiamate=[chiamata("stato_budget", {})])
            return risposta_modello("Ecco il budget.")

        with patch.object(domande, "_chiama_modello", modello):
            testo = domande.rispondi_a_domanda("budget?", db, utente, OGGI, lambda: None)
        assert testo == "Ecco il budget."
        assert giri == [True] * domande.MAX_GIRI + [False]

    def test_quota_esaurita_ferma_il_dialogo(self, db, utente):
        def quota():
            raise categorization.ServizioOccupato()

        with patch.object(domande, "_chiama_modello") as modello:
            with pytest.raises(categorization.ServizioOccupato):
                domande.rispondi_a_domanda("quanto?", db, utente, OGGI, quota)
        modello.assert_not_called()

    def test_un_guasto_del_modello_non_rompe_l_endpoint(self, db, utente):
        with patch.object(domande, "_chiama_modello", side_effect=RuntimeError("giu'")):
            assert domande.rispondi_a_domanda("quanto?", db, utente, OGGI, lambda: None) is None


# --- endpoint ----------------------------------------------------------------

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
             patch.object(domande, "rispondi_a_domanda", return_value="Hai speso 10 €."):
            r = invia(client, "Quanto ho speso?")
        assert r.json() == {"tipo": "risposta", "testo": "Hai speso 10 €."}
        estrazione.assert_not_called()

    def test_cio_che_non_e_una_spesa_diventa_una_domanda(self, client, connesso):
        with patch("app.business_logic.categorization.extract_expense_from_text", return_value=None), \
             patch.object(domande, "rispondi_a_domanda", return_value="Hai speso 10 €.") as risposta:
            r = invia(client, "spese di settembre")
        assert r.json()["tipo"] == "risposta"
        risposta.assert_called_once()

    def test_nessuna_risposta_da_422(self, client, connesso):
        with patch.object(domande, "rispondi_a_domanda", return_value=None):
            assert invia(client, "Quanto ho speso?").status_code == 422

    def test_groq_saturo_da_503(self, client, connesso):
        with patch.object(domande, "rispondi_a_domanda", side_effect=categorization.ServizioOccupato()):
            assert invia(client, "Quanto ho speso?").status_code == 503

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
    def test_i_due_endpoint_condividono_il_tetto_globale(self, client, make_user, login_as,
                                                          make_category, limiter_attivo):
        make_category(name="Altro")
        codici = []
        with patch("app.business_logic.categorization.extract_expense_from_text", return_value=ESTRAZIONE_FINTA):
            for i in range(2):
                token = token_di(make_user, login_as, f"vecchia{i}@example.com")
                for _ in range(4):
                    codici.append(client.post("/expenses/extract-preview", json={"expenseText": "Pizza 15"},
                                              headers={"Authorization": token}).status_code)
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
                    assert client.post("/expenses/extract-preview", json={"expenseText": "Pizza 15"},
                                       headers={"Authorization": token}).status_code == 200

        richieste = []

        def modello(messaggi, con_strumenti):
            richieste.append(1)
            return risposta_modello(chiamate=[chiamata("stato_budget", {})])

        token = token_di(make_user, login_as, "domanda@example.com")
        with patch.object(domande, "_chiama_modello", modello):
            r = invia(client, "Come va il budget?", token)
        assert r.status_code == 503
        assert len(richieste) == 1

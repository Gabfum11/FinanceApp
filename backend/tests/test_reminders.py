"""Promemoria push degli abbonamenti, fatti partire dal cron ogni mattina.

L'invio a Expo e' sostituito da un finto: i test non mandano notifiche vere e
possono decidere l'esito di ogni messaggio.
"""
from datetime import timedelta

import pytest

from app import models
from app.business_logic import reminders

CHIAVE = "chiave-di-prova"
TOKEN = "ExponentPushToken[abc123]"


@pytest.fixture
def cron(client, monkeypatch):
    """Chiama l'endpoint come farebbe cron-job.org, con la chiave giusta."""
    monkeypatch.setenv("REMINDER_CRON_KEY", CHIAVE)
    return lambda: client.post("/internal/send-reminders", headers={"X-Cron-Key": CHIAVE})


@pytest.fixture
def expo(monkeypatch):
    """Sostituisce Expo: registra i messaggi e risponde con gli esiti scelti dal test."""
    finto = {"messaggi": [], "esito": {"status": "ok", "id": "ticket"}}

    def invia(messaggi):
        finto["messaggi"].extend(messaggi)
        return [dict(finto["esito"]) for _ in messaggi]

    monkeypatch.setattr(reminders, "invia_a_expo", invia)
    return finto


@pytest.fixture
def abbonamento(db_session, make_user):
    def _crea(giorni=1, token=TOKEN, is_active=True, email="u@t.it", **extra):
        user_id = make_user(email=email, push_token=token)
        db = db_session()
        sub = models.Subscriptions(
            description=extra.pop("description", "Netflix"),
            amount=extra.pop("amount", 12.99),
            frequency=extra.pop("frequency", "monthly"),
            next_date=reminders.oggi_in_italia() + timedelta(days=giorni),
            user_id=user_id,
            is_active=is_active,
            **extra,
        )
        db.add(sub)
        db.commit()
        ids = (sub.id, user_id)
        db.close()
        return ids

    return _crea


def leggi(db_session, modello, id_):
    db = db_session()
    riga = db.query(modello).filter(modello.id == id_).first()
    db.close()
    return riga


class TestChiave:
    def test_senza_chiave_rifiuta(self, client, monkeypatch, expo):
        monkeypatch.setenv("REMINDER_CRON_KEY", CHIAVE)
        assert client.post("/internal/send-reminders").status_code == 401

    def test_chiave_sbagliata_rifiuta(self, client, monkeypatch, expo):
        monkeypatch.setenv("REMINDER_CRON_KEY", CHIAVE)
        r = client.post("/internal/send-reminders", headers={"X-Cron-Key": "indovina"})
        assert r.status_code == 401

    def test_chiave_non_configurata_non_lascia_aperto(self, client, monkeypatch, expo):
        """Senza chiave su Render l'endpoint non deve diventare pubblico."""
        monkeypatch.delenv("REMINDER_CRON_KEY", raising=False)
        r = client.post("/internal/send-reminders", headers={"X-Cron-Key": ""})
        assert r.status_code == 503


class TestQualiAbbonamenti:
    def test_invia_per_chi_si_rinnova_domani(self, cron, expo, abbonamento):
        abbonamento(giorni=1)
        r = cron()
        assert r.status_code == 200
        assert r.json()["inviati"] == 1
        assert len(expo["messaggi"]) == 1

    def test_non_invia_per_dopodomani_ne_per_oggi(self, cron, expo, abbonamento):
        abbonamento(giorni=2, email="a@t.it")
        abbonamento(giorni=0, email="b@t.it")
        cron()
        assert expo["messaggi"] == []

    def test_non_invia_per_un_abbonamento_in_pausa(self, cron, expo, abbonamento):
        abbonamento(is_active=False)
        cron()
        assert expo["messaggi"] == []

    def test_non_invia_a_chi_non_ha_attivato_i_promemoria(self, cron, expo, abbonamento):
        abbonamento(token=None)
        cron()
        assert expo["messaggi"] == []

    def test_una_notifica_per_abbonamento(self, cron, expo, abbonamento, db_session):
        """Due rinnovi lo stesso giorno: due notifiche, non un riepilogo."""
        sub_id, user_id = abbonamento(description="Netflix")
        db = db_session()
        db.add(models.Subscriptions(
            description="Spotify", amount=9.99, frequency="monthly",
            next_date=reminders.oggi_in_italia() + timedelta(days=1),
            user_id=user_id, is_active=True,
        ))
        db.commit()
        db.close()
        cron()
        titoli = sorted(m["title"] for m in expo["messaggi"])
        assert titoli == ["Netflix si rinnova domani", "Spotify si rinnova domani"]


class TestContenuto:
    def test_testo_canale_e_dati(self, cron, expo, abbonamento):
        sub_id, _ = abbonamento(description="Netflix", amount=12.99, frequency="monthly")
        cron()
        m = expo["messaggi"][0]
        assert m["to"] == TOKEN
        assert m["title"] == "Netflix si rinnova domani"
        assert m["body"] == "12,99 € · mensile"
        assert m["channelId"] == "abbonamenti"
        assert m["data"] == {"subscriptionId": sub_id}

    def test_scade_con_la_fine_del_giorno_del_rinnovo(self, cron, expo, abbonamento):
        """Un avviso "si rinnova domani" ricevuto dopo il rinnovo confonderebbe."""
        abbonamento()
        cron()
        ttl = expo["messaggi"][0]["ttl"]
        assert 0 < ttl <= 2 * 24 * 3600


class TestNienteDoppioni:
    def test_seconda_chiamata_nello_stesso_giorno(self, cron, expo, abbonamento):
        """cron-job.org ritenta se la risposta tarda: non deve arrivare due volte."""
        abbonamento()
        cron()
        r = cron()
        assert r.json()["inviati"] == 0
        assert len(expo["messaggi"]) == 1

    def test_segna_la_data_del_rinnovo(self, cron, expo, abbonamento, db_session):
        sub_id, _ = abbonamento()
        cron()
        sub = leggi(db_session, models.Subscriptions, sub_id)
        assert sub.reminder_sent_for == sub.next_date

    def test_al_rinnovo_successivo_avvisa_di_nuovo(self, cron, expo, abbonamento, db_session):
        """Il segno vale per quella data: il mese dopo il promemoria riparte."""
        sub_id, _ = abbonamento()
        db = db_session()
        db.query(models.Subscriptions).filter(models.Subscriptions.id == sub_id).first().reminder_sent_for = (
            reminders.oggi_in_italia() - timedelta(days=30)
        )
        db.commit()
        db.close()
        cron()
        assert len(expo["messaggi"]) == 1


class TestEsitiDiExpo:
    def test_telefono_non_piu_registrato_perde_il_token(self, cron, expo, abbonamento, db_session):
        """App disinstallata: continuare a inviare non serve."""
        expo["esito"] = {"status": "error", "details": {"error": "DeviceNotRegistered"}}
        sub_id, user_id = abbonamento()
        r = cron()
        assert r.json()["token_rimossi"] == 1
        assert leggi(db_session, models.User, user_id).push_token is None
        assert leggi(db_session, models.Subscriptions, sub_id).reminder_sent_for is None

    def test_errore_temporaneo_si_riprova(self, cron, expo, abbonamento, db_session):
        """Non segnato come inviato: la chiamata successiva ci riprova."""
        expo["esito"] = {"status": "error", "message": "limite superato", "details": {"error": "MessageRateExceeded"}}
        sub_id, user_id = abbonamento()
        cron()
        assert leggi(db_session, models.Subscriptions, sub_id).reminder_sent_for is None
        assert leggi(db_session, models.User, user_id).push_token == TOKEN

        expo["esito"] = {"status": "ok", "id": "ticket"}
        assert cron().json()["inviati"] == 1

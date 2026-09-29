"""Rinnovi eseguiti da piu' richieste nello stesso momento.

La Home chiede spese, budget e statistiche in parallelo, e ognuna esegue i
rinnovi scaduti: senza un blocco sulle righe tutte leggevano la stessa
next_date e un solo rinnovo diventava tre spese.

SQLite (usato nei test) non ha i blocchi di riga, quindi la concorrenza vera
non si puo' riprodurre qui: si verifica che la query chieda il blocco a
PostgreSQL, e che richieste in sequenza non duplichino nulla.
"""
from datetime import date, timedelta

from sqlalchemy.dialects import postgresql

from app import models
from app.routers.subscriptions import abbonamenti_bloccati


def conta_spese(db_session, user_id):
    db = db_session()
    n = db.query(models.Expense).filter(models.Expense.user_id == user_id).count()
    db.close()
    return n


class TestBlocco:
    def test_la_query_dei_rinnovi_blocca_le_righe(self, db_session):
        db = db_session()
        sql = str(abbonamenti_bloccati(db, 1).statement.compile(dialect=postgresql.dialect()))
        db.close()
        assert "FOR UPDATE" in sql


class TestNessunDuplicato:
    def test_le_richieste_della_home_registrano_un_solo_rinnovo(self, client, db_session, make_user, login_as):
        """Le tre richieste che la Home fa all'apertura, una dopo l'altra."""
        user_id = make_user(email="home@t.it")
        login_as(user_id)
        db = db_session()
        db.add(models.Subscriptions(
            description="Netflix", amount=12.0, frequency="monthly",
            next_date=date.today(), user_id=user_id, is_active=True, auto_renew=True,
        ))
        db.commit()
        db.close()

        client.get("/expenses/?limit=5")
        client.get("/budget/status")
        client.get("/expenses/weekly-stats")

        assert conta_spese(db_session, user_id) == 1

    def test_senza_rinnovi_scaduti_non_crea_spese(self, client, db_session, make_user, login_as):
        user_id = make_user(email="futuro@t.it")
        login_as(user_id)
        db = db_session()
        db.add(models.Subscriptions(
            description="Spotify", amount=10.0, frequency="monthly",
            next_date=date.today() + timedelta(days=5), user_id=user_id,
            is_active=True, auto_renew=True,
        ))
        db.commit()
        db.close()

        client.get("/budget/status")
        assert conta_spese(db_session, user_id) == 0

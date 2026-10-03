"""Testi che partono dal server nella lingua dell'utente.

Email con il codice, notifiche dei rinnovi, file esportati e date scritte in
inglese all'assistente. Una lingua sconosciuta ricade sull'italiano.
"""
from datetime import date, timedelta
from unittest.mock import AsyncMock, patch

import pytest

from app import models
from app.business_logic import email_service, reminders
from app.business_logic.categorization import _resolve_date_expr
from app.business_logic.testi import nome_categoria, testo as traduci

# 20 settembre 2026 e' una domenica
DOMENICA = date(2026, 9, 20)


class TestTesti:
    def test_lingua_sconosciuta_ricade_sull_italiano(self):
        assert traduci("fr", "csv_data") == "Data"
        assert traduci(None, "csv_data") == "Data"

    def test_categorie_in_inglese(self):
        assert nome_categoria("Palestra", "en") == "Gym"
        assert nome_categoria("Casa (generico)", "en") == "Home (general)"
        assert nome_categoria("Palestra", "it") == "Palestra"

    def test_categoria_sconosciuta_resta_com_e(self):
        assert nome_categoria("Hobby", "en") == "Hobby"


class TestEmail:
    @pytest.fixture
    def brevo(self):
        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as post:
            post.return_value.raise_for_status = lambda: None
            yield post

    async def _invia(self, lingua, scopo="email_verification"):
        await email_service.send_otp_email("a@t.it", "123456", purpose=scopo, lingua=lingua)

    def test_in_inglese(self, brevo):
        import asyncio
        asyncio.run(self._invia("en"))
        corpo = brevo.call_args.kwargs["json"]
        assert corpo["subject"] == "Verify your account"
        assert "Your code is: 123456" in corpo["textContent"]

    def test_reset_in_italiano(self, brevo):
        import asyncio
        asyncio.run(self._invia("it", "password_reset"))
        assert brevo.call_args.kwargs["json"]["subject"] == "Reimposta la tua password"

    def test_la_registrazione_usa_la_lingua_scelta_nell_app(self, client, db_session):
        with patch("app.business_logic.email_service.send_otp_email", new_callable=AsyncMock) as invia:
            r = client.post("/auth/register", json={"email": "new@t.it", "password": "password123",
                                                    "nickname": "Ann", "language": "en"})
        assert r.status_code == 200
        assert invia.call_args.kwargs["lingua"] == "en"
        db = db_session()
        assert db.query(models.User).filter(models.User.email == "new@t.it").one().language == "en"
        db.close()

    def test_senza_lingua_la_registrazione_resta_in_italiano(self, client):
        with patch("app.business_logic.email_service.send_otp_email", new_callable=AsyncMock) as invia:
            client.post("/auth/register", json={"email": "vecchia@t.it", "password": "password123", "nickname": "X"})
        assert invia.call_args.kwargs["lingua"] == "it"


class TestNotifiche:
    def test_in_inglese(self, make_user, db_session):
        user_id = make_user(email="en@t.it", language="en", currency="GBP", push_token="ExponentPushToken[x]")
        db = db_session()
        utente = db.query(models.User).get(user_id)
        sub = models.Subscriptions(description="Gym", amount=39.9, frequency="monthly",
                                   next_date=date.today() + timedelta(days=1), user_id=user_id)
        messaggio = reminders._messaggio(sub, utente)
        db.close()
        assert messaggio["title"] == "Gym renews tomorrow"
        assert messaggio["body"] == "£39.90 · monthly"


class TestEsportazione:
    @pytest.fixture
    def inglese(self, client, make_user, login_as, db_session):
        user_id = make_user(email="csv@t.it", language="en")
        login_as(user_id)
        db = db_session()
        casa = models.Category(name="Casa")
        db.add(casa)
        db.flush()
        energia = models.Category(name="Bolletta energia", parent_id=casa.id)
        db.add(energia)
        db.commit()
        energia_id = energia.id
        db.close()
        client.post("/expenses/", json={"description": "Power", "amount": 85.5, "date": "2026-09-01", "category_id": energia_id})
        return client

    def test_intestazioni_virgola_e_punto(self, inglese):
        righe = inglese.get("/export/expenses.csv").text.lstrip("﻿").splitlines()
        assert righe[0] == "Date,Description,Amount (EUR),Original amount,Original currency,Category,Group"
        assert righe[1] == "2026-09-01,Power,85.50,,,Energy bill,Home"

    def test_nome_file_in_inglese(self, inglese):
        assert "trackit-expenses-" in inglese.get("/export/expenses.csv").headers["content-disposition"]


class TestDateInInglese:
    @pytest.mark.parametrize(
        "espressione,atteso",
        [
            ("today", date(2026, 9, 20)),
            ("yesterday", date(2026, 9, 19)),
            ("day before yesterday", date(2026, 9, 18)),
            ("the day before yesterday", date(2026, 9, 18)),
            ("friday", date(2026, 9, 18)),
            ("last friday", date(2026, 9, 18)),
            ("on monday", date(2026, 9, 14)),
            ("3 September", date(2026, 9, 3)),
            ("September 3", date(2026, 9, 3)),
            ("Sept 3rd, 2025", date(2025, 9, 3)),
            ("the 3rd of September", date(2026, 9, 3)),
            ("on 3 September", date(2026, 9, 3)),
            ("may 1", date(2026, 5, 1)),
        ],
    )
    def test_risolve(self, espressione, atteso):
        assert _resolve_date_expr(espressione, DOMENICA) == atteso

    def test_domenica_significa_quella_scorsa(self):
        assert _resolve_date_expr("sunday", DOMENICA) == date(2026, 9, 13)

    def test_l_italiano_funziona_come_prima(self):
        assert _resolve_date_expr("ieri", DOMENICA) == date(2026, 9, 19)
        assert _resolve_date_expr("3 settembre", DOMENICA) == date(2026, 9, 3)

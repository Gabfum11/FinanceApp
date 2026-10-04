"""Le regole sui dati in entrata (schemas.py): cio' che non le rispetta e' 422.

Un importo o un nome fuori misura non deve arrivare al database: e' quasi
sempre un errore di battitura (uno zero di troppo) o una richiesta malformata.
"""
import pytest


@pytest.fixture
def utente(make_user, login_as):
    login_as(make_user(email="limiti@t.it"))


class TestBudget:
    @pytest.mark.parametrize("budget", [0, -100, 1000000.01])
    def test_fuori_misura_rifiutato(self, client, utente, budget):
        r = client.patch("/auth/updateBudget", json={"monthly_budget": budget, "budget_start_day": 1})
        assert r.status_code == 422

    def test_il_massimo_e_accettato(self, client, utente):
        r = client.patch("/auth/updateBudget", json={"monthly_budget": 1000000, "budget_start_day": 1})
        assert r.status_code == 200


class TestAbbonamento:
    @pytest.mark.parametrize("dati", [
        {"description": "", "amount": 10},
        {"description": "Palestra", "amount": 0},
        {"description": "Palestra", "amount": -5},
        {"description": "Palestra", "amount": 2000000},
        {"description": "x" * 201, "amount": 10},
    ])
    def test_fuori_misura_rifiutato(self, client, utente, dati):
        r = client.post("/subscriptions/", json={**dati, "frequency": "monthly"})
        assert r.status_code == 422


class TestRegistrazione:
    @pytest.mark.parametrize("nickname", ["", "x" * 51])
    def test_nome_fuori_misura_rifiutato(self, client, nickname):
        r = client.post("/auth/register", json={"email": "nuovo@t.it", "password": "password123", "nickname": nickname})
        assert r.status_code == 422

"""Gerarchia delle categorie.

Le categorie sono a due livelli: i gruppi fanno da intestazione, le spese
puntano sempre a una sottocategoria. Senza questa separazione i totali delle
statistiche sarebbero ambigui.
"""
import pytest

from app import models


@pytest.fixture
def utente(make_user, login_as):
    user_id = make_user(email="cat@example.com")
    login_as(user_id)
    return user_id


@pytest.fixture
def gerarchia(db_session):
    """Due gruppi con le loro sottocategorie, più uno senza figlie."""
    db = db_session()
    casa = models.Category(name="Casa", keywords=None, parent_id=None)
    cibo = models.Category(name="Cibo e bevande", keywords=None, parent_id=None)
    vuoto = models.Category(name="Vuoto", keywords=None, parent_id=None)
    db.add_all([casa, cibo, vuoto])
    db.commit()
    db.refresh(casa)
    db.refresh(cibo)

    db.add_all([
        models.Category(name="Affitto o mutuo", keywords="affitto,mutuo", parent_id=casa.id),
        models.Category(name="Bolletta energia", keywords="luce,gas", parent_id=casa.id),
        models.Category(name="Casa (generico)", keywords=None, parent_id=casa.id),
        models.Category(name="Bar e caffè", keywords="bar,caffè", parent_id=cibo.id),
        models.Category(name="Spesa alimentare", keywords="supermercato", parent_id=cibo.id),
    ])
    db.commit()
    ids = {"casa": casa.id, "cibo": cibo.id, "vuoto": vuoto.id}
    db.close()
    return ids


class TestElencoRaggruppato:
    def test_restituisce_solo_i_gruppi_al_primo_livello(self, client, utente, gerarchia):
        r = client.get("/categories/grouped")
        assert r.status_code == 200
        nomi = [g["name"] for g in r.json()]
        assert nomi == ["Casa", "Cibo e bevande", "Vuoto"], "ordinati per nome"

    def test_ogni_gruppo_porta_le_sue_sottocategorie(self, client, utente, gerarchia):
        gruppi = {g["name"]: g for g in client.get("/categories/grouped").json()}
        assert len(gruppi["Casa"]["children"]) == 3
        assert len(gruppi["Cibo e bevande"]["children"]) == 2

    def test_le_sottocategorie_sono_ordinate(self, client, utente, gerarchia):
        gruppi = {g["name"]: g for g in client.get("/categories/grouped").json()}
        nomi = [c["name"] for c in gruppi["Casa"]["children"]]
        assert nomi == sorted(nomi)

    def test_un_gruppo_senza_figlie_resta_vuoto(self, client, utente, gerarchia):
        gruppi = {g["name"]: g for g in client.get("/categories/grouped").json()}
        assert gruppi["Vuoto"]["children"] == []

    def test_le_sottocategorie_puntano_al_proprio_gruppo(self, client, utente, gerarchia):
        gruppi = {g["name"]: g for g in client.get("/categories/grouped").json()}
        for figlia in gruppi["Casa"]["children"]:
            assert figlia["parent_id"] == gerarchia["casa"]

    def test_nessun_gruppo_compare_tra_le_figlie(self, client, utente, gerarchia):
        """Un gruppo non deve mai risultare selezionabile."""
        risposta = client.get("/categories/grouped").json()
        id_gruppi = {g["id"] for g in risposta}
        id_figlie = {c["id"] for g in risposta for c in g["children"]}
        assert id_gruppi.isdisjoint(id_figlie)

    def test_richiede_autenticazione(self, db_session):
        from fastapi.testclient import TestClient
        from app.main import app

        #senza login_as la dipendenza non è sovrascritta
        r = TestClient(app, raise_server_exceptions=False).get("/categories/grouped")
        assert r.status_code == 401


class TestElencoPiatto:
    """L'endpoint originale resta invariato per chi lo usa già."""

    def test_restituisce_tutte_le_categorie(self, client, utente, gerarchia):
        r = client.get("/categories/")
        assert r.status_code == 200
        assert len(r.json()) == 8, "3 gruppi + 5 sottocategorie"

    def test_espone_il_parent_id(self, client, utente, gerarchia):
        per_nome = {c["name"]: c for c in client.get("/categories/").json()}
        assert per_nome["Casa"]["parent_id"] is None
        assert per_nome["Affitto o mutuo"]["parent_id"] == gerarchia["casa"]


class TestStatisticheAggregate:
    """Il grafico mostra i gruppi: con 47 sottocategorie sarebbe illeggibile."""

    @pytest.fixture
    def spese_su_piu_sottocategorie(self, client, db_session, gerarchia):
        from datetime import date

        db = db_session()
        per_nome = {c.name: c.id for c in db.query(models.Category).all()}
        db.close()

        oggi = date.today().isoformat()
        #due sottocategorie diverse dello stesso gruppo
        client.post("/expenses/", json={"description": "Affitto", "amount": 500.0,
                                        "date": oggi, "category_id": per_nome["Affitto o mutuo"]})
        client.post("/expenses/", json={"description": "Enel", "amount": 80.0,
                                        "date": oggi, "category_id": per_nome["Bolletta energia"]})
        #un gruppo diverso
        client.post("/expenses/", json={"description": "Caffè", "amount": 3.0,
                                        "date": oggi, "category_id": per_nome["Bar e caffè"]})
        return per_nome

    def test_le_sottocategorie_confluiscono_nel_gruppo(self, client, utente, spese_su_piu_sottocategorie):
        risultati = {c["category_name"]: c["total"] for c in client.get("/expenses/stats").json()["categories"]}
        assert risultati["Casa"] == 580.0, "affitto 500 + bolletta 80, sommati sotto Casa"
        assert risultati["Cibo e bevande"] == 3.0

    def test_le_sottocategorie_non_compaiono_come_fette(self, client, utente, spese_su_piu_sottocategorie):
        nomi = [c["category_name"] for c in client.get("/expenses/stats").json()["categories"]]
        assert "Affitto o mutuo" not in nomi
        assert "Bolletta energia" not in nomi

    def test_una_fetta_per_gruppo(self, client, utente, spese_su_piu_sottocategorie):
        nomi = [c["category_name"] for c in client.get("/expenses/stats").json()["categories"]]
        assert len(nomi) == len(set(nomi)), "nessun gruppo duplicato"
        assert len(nomi) == 2

    def test_ordinate_per_importo_decrescente(self, client, utente, spese_su_piu_sottocategorie):
        """La palette ha pochi colori: vanno alle voci che pesano di più."""
        totali = [c["total"] for c in client.get("/expenses/stats").json()["categories"]]
        assert totali == sorted(totali, reverse=True)

    def test_il_totale_coincide_con_la_somma_delle_spese(self, client, utente, spese_su_piu_sottocategorie):
        totale = sum(c["total"] for c in client.get("/expenses/stats").json()["categories"])
        assert totale == 583.0

    def test_una_categoria_senza_gruppo_resta_a_se(self, client, utente, db_session):
        """Le categorie non ancora inserite nella gerarchia non devono sparire."""
        from datetime import date

        db = db_session()
        orfana = models.Category(name="Senza gruppo", keywords=None, parent_id=None)
        db.add(orfana)
        db.commit()
        db.refresh(orfana)
        orfana_id = orfana.id
        db.close()

        client.post("/expenses/", json={"description": "X", "amount": 10.0,
                                        "date": date.today().isoformat(), "category_id": orfana_id})
        nomi = [c["category_name"] for c in client.get("/expenses/stats").json()["categories"]]
        assert "Senza gruppo" in nomi


class TestSpeseSulleSottocategorie:
    def test_una_spesa_puo_usare_una_sottocategoria(self, client, utente, db_session, gerarchia):
        db = db_session()
        affitto = db.query(models.Category).filter(models.Category.name == "Affitto o mutuo").first()
        affitto_id = affitto.id
        db.close()

        r = client.post("/expenses/", json={
            "description": "Affitto settembre", "amount": 500.0,
            "date": "2026-09-01", "category_id": affitto_id,
        })
        assert r.status_code == 200
        assert r.json()["category_name"] == "Affitto o mutuo"

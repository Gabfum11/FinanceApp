"""Le due colonne nuove delle spese importate."""
from datetime import date

from app import models


def test_spesa_importata_conserva_testo_e_codice(db_session, make_user):
    utente = make_user()
    db = db_session()
    db.add(models.Expense(
        user_id=utente, description="Conad", amount=42.3, date=date(2026, 9, 2),
        descrizione_banca="PAGAMENTO POS CONAD", importazione_id="0b1c2d3e-0000-4000-8000-000000000001",
    ))
    db.commit()
    spesa = db.query(models.Expense).one()
    assert spesa.descrizione_banca == "PAGAMENTO POS CONAD"
    assert spesa.importazione_id == "0b1c2d3e-0000-4000-8000-000000000001"


def test_spesa_a_mano_le_lascia_vuote(db_session, make_user):
    utente = make_user()
    db = db_session()
    db.add(models.Expense(user_id=utente, description="Pizza", amount=15, date=date(2026, 9, 2)))
    db.commit()
    spesa = db.query(models.Expense).one()
    assert spesa.descrizione_banca is None
    assert spesa.importazione_id is None

"""cifra descrizioni e budget

Revision ID: b7d9f1a3c5e8
Revises: a5c7e9b1d3f6
Create Date: 2026-10-11 12:00:00.000000

Descrizioni delle spese e degli abbonamenti, testo della banca e budget
diventano testo cifrato con CHIAVE_CIFRATURA: chi apre il database non li
legge. Serve la stessa chiave che usera' il server, gia' impostata.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

from app.business_logic.cifratura import cifra, decifra


revision: str = 'b7d9f1a3c5e8'
down_revision: Union[str, Sequence[str], None] = 'a5c7e9b1d3f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TESTI = [("expenses", "description"), ("expenses", "descrizione_banca"), ("subscriptions", "description")]
NUMERI = [("users", "monthly_budget"), ("budget_history", "amount")]


def _converti(tabella, colonna, funzione):
    db = op.get_bind()
    righe = db.execute(sa.text(f"SELECT id, {colonna} FROM {tabella} WHERE {colonna} IS NOT NULL")).all()
    for id_, valore in righe:
        db.execute(sa.text(f"UPDATE {tabella} SET {colonna} = :v WHERE id = :id"), {"v": funzione(valore), "id": id_})


def upgrade() -> None:
    for tabella, colonna in TESTI:
        op.alter_column(tabella, colonna, type_=sa.Text())
        _converti(tabella, colonna, cifra)
    for tabella, colonna in NUMERI:
        op.alter_column(tabella, colonna, type_=sa.Text(), postgresql_using=f"{colonna}::text")
        #repr(float) come NumeroCifrato, cosi' l'app rilegge lo stesso numero
        _converti(tabella, colonna, lambda v: cifra(repr(float(v))))


def downgrade() -> None:
    for tabella, colonna in TESTI:
        _converti(tabella, colonna, decifra)
        op.alter_column(tabella, colonna, type_=sa.String())
    for tabella, colonna in NUMERI:
        _converti(tabella, colonna, decifra)
        op.alter_column(tabella, colonna, type_=sa.Float(), postgresql_using=f"{colonna}::double precision")

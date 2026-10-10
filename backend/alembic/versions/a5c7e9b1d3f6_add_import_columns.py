"""add import columns to expenses

Revision ID: a5c7e9b1d3f6
Revises: e2a6c8f0b4d1
Create Date: 2026-10-10 12:00:00.000000

Le spese importate dall'estratto conto conservano il testo della banca (per
riconoscere l'esercente ai caricamenti successivi) e il codice del caricamento
(per annullarlo in blocco). Vuote per le spese inserite a mano.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a5c7e9b1d3f6'
down_revision: Union[str, Sequence[str], None] = 'e2a6c8f0b4d1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('expenses', sa.Column('descrizione_banca', sa.String(), nullable=True))
    op.add_column('expenses', sa.Column('importazione_id', sa.String(length=36), nullable=True))
    op.create_index('ix_expenses_importazione_id', 'expenses', ['importazione_id'])


def downgrade() -> None:
    op.drop_index('ix_expenses_importazione_id', table_name='expenses')
    op.drop_column('expenses', 'importazione_id')
    op.drop_column('expenses', 'descrizione_banca')

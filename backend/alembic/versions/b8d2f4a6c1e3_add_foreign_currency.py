"""add foreign currency to expenses and subscriptions

Revision ID: b8d2f4a6c1e3
Revises: a3e7c1d9b4f2
Create Date: 2026-10-03 20:00:00.000000

Spese e abbonamenti pagati in un'altra valuta. La spesa conserva la cifra
originale e il tasso usato; amount resta nella valuta dell'utente. Colonne
tutte facoltative: le righe esistenti restano spese nella valuta dell'utente.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b8d2f4a6c1e3'
down_revision: Union[str, Sequence[str], None] = 'a3e7c1d9b4f2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('expenses', sa.Column('original_amount', sa.Float(), nullable=True))
    op.add_column('expenses', sa.Column('original_currency', sa.String(length=3), nullable=True))
    op.add_column('expenses', sa.Column('exchange_rate', sa.Float(), nullable=True))
    op.add_column('subscriptions', sa.Column('currency', sa.String(length=3), nullable=True))


def downgrade() -> None:
    op.drop_column('subscriptions', 'currency')
    op.drop_column('expenses', 'exchange_rate')
    op.drop_column('expenses', 'original_currency')
    op.drop_column('expenses', 'original_amount')

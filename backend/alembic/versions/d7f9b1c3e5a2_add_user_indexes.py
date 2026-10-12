"""indici sulle spese e sugli abbonamenti di un utente

Revision ID: d7f9b1c3e5a2
Revises: c6e8a0b2d4f1
Create Date: 2026-10-12 13:00:00.000000

Postgres non indicizza da solo le chiavi esterne: ogni richiesta filtrata per
utente leggeva l'intera tabella, con le righe di tutti gli utenti.
"""
from typing import Sequence, Union

from alembic import op


revision: str = 'd7f9b1c3e5a2'
down_revision: Union[str, Sequence[str], None] = 'c6e8a0b2d4f1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index('ix_expenses_user_date', 'expenses', ['user_id', 'date'])
    op.create_index('ix_subscriptions_user_id', 'subscriptions', ['user_id'])


def downgrade() -> None:
    op.drop_index('ix_subscriptions_user_id', table_name='subscriptions')
    op.drop_index('ix_expenses_user_date', table_name='expenses')

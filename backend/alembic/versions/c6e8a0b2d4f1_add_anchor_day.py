"""giorno del mese in cui si rinnova un abbonamento

Revision ID: c6e8a0b2d4f1
Revises: b7d9f1a3c5e8
Create Date: 2026-10-12 12:00:00.000000

Senza, un abbonamento del 31 passava al 28 dopo febbraio e ci restava. Gli
abbonamenti esistenti prendono il giorno della loro next_date: quelli gia'
scivolati al 28 restano al 28, finche' l'utente non sposta la data.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c6e8a0b2d4f1'
down_revision: Union[str, Sequence[str], None] = 'b7d9f1a3c5e8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('subscriptions', sa.Column('anchor_day', sa.Integer(), nullable=True))
    op.execute(
        "UPDATE subscriptions SET anchor_day = EXTRACT(DAY FROM next_date) "
        "WHERE frequency <> 'weekly'"
    )


def downgrade() -> None:
    op.drop_column('subscriptions', 'anchor_day')

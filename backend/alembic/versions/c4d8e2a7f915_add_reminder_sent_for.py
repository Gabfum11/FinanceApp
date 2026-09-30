"""add reminder_sent_for to subscriptions

Revision ID: c4d8e2a7f915
Revises: b7e2c9d41a56
Create Date: 2026-09-30 12:00:00.000000

La data di rinnovo per cui il promemoria push e' gia' stato inviato. Il cron
che fa partire i promemoria puo' chiamare piu' volte (ritenta se la risposta
arriva tardi): senza questo campo ogni chiamata manderebbe la stessa notifica.

Nullable: nessun abbonamento esistente ha ancora ricevuto un promemoria.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c4d8e2a7f915'
down_revision: Union[str, Sequence[str], None] = 'b7e2c9d41a56'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('subscriptions', sa.Column('reminder_sent_for', sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column('subscriptions', 'reminder_sent_for')

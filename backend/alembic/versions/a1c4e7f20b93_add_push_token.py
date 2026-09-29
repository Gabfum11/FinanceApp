"""add push_token to users

Revision ID: a1c4e7f20b93
Revises: d5a1f8c37e92
Create Date: 2026-09-29 12:00:00.000000

Il token con cui Expo recapita le notifiche push al telefono dell'utente. I
promemoria degli abbonamenti partono dal server: pianificati sul telefono si
perdevano se all'ora prevista era spento.

Nullable: chi non ha acceso i promemoria non ha un token, e nessun utente
esistente ne ha uno finche' l'app non lo registra.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1c4e7f20b93'
down_revision: Union[str, Sequence[str], None] = 'd5a1f8c37e92'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('push_token', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'push_token')

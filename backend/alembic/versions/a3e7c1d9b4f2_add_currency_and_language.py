"""add currency and language to users

Revision ID: a3e7c1d9b4f2
Revises: f1a9b3c5d7e2
Create Date: 2026-10-03 18:00:00.000000

Valuta e lingua scelte dal Profilo. Le spese restano numeri senza valuta: la
valuta decide solo come mostrarli. La lingua serve ai testi che partono dal
server (email, notifiche, esportazione).

server_default: gli utenti esistenti restano in euro e in italiano, come prima.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a3e7c1d9b4f2'
down_revision: Union[str, Sequence[str], None] = 'f1a9b3c5d7e2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('currency', sa.String(length=3), nullable=False, server_default='EUR'))
    op.add_column('users', sa.Column('language', sa.String(length=2), nullable=False, server_default='it'))


def downgrade() -> None:
    op.drop_column('users', 'language')
    op.drop_column('users', 'currency')

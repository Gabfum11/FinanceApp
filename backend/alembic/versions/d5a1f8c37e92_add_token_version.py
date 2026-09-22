"""add token_version to users

Revision ID: d5a1f8c37e92
Revises: c3b8e5d21f47
Create Date: 2026-09-22 14:00:00.000000

Il numero finisce dentro ogni token emesso: incrementandolo, tutti quelli già
in circolazione per quell'utente diventano invalidi. Senza, un token rubato
resta utilizzabile fino alla scadenza naturale, che con "Ricordami" è 30 giorni.

I token emessi prima di questa migrazione non contengono il campo: vengono
trattati come versione 0, che coincide con il valore iniziale. Nessuno viene
disconnesso dal deploy.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd5a1f8c37e92'
down_revision: Union[str, Sequence[str], None] = 'c3b8e5d21f47'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'users',
        sa.Column('token_version', sa.Integer(), nullable=False, server_default='0'),
    )


def downgrade() -> None:
    op.drop_column('users', 'token_version')

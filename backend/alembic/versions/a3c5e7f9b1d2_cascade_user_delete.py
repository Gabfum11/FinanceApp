"""cancellare un utente cancella anche le sue righe nelle altre tabelle

Revision ID: a3c5e7f9b1d2
Revises: d7f9b1c3e5a2
Create Date: 2026-10-15 12:00:00.000000

Le chiavi esterne verso users erano senza nome: Postgres le ha chiamate
<tabella>_user_id_fkey. Si ricreano con lo stesso nome e ON DELETE CASCADE.
"""
from typing import Sequence, Union

from alembic import op


revision: str = 'a3c5e7f9b1d2'
down_revision: Union[str, Sequence[str], None] = 'd7f9b1c3e5a2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABELLE = ['expenses', 'subscriptions', 'otp_codes', 'refresh_tokens', 'budget_history']


def _ricrea(ondelete) -> None:
    for tabella in TABELLE:
        nome = f'{tabella}_user_id_fkey'
        op.drop_constraint(nome, tabella, type_='foreignkey')
        op.create_foreign_key(nome, tabella, 'users', ['user_id'], ['id'], ondelete=ondelete)


def upgrade() -> None:
    _ricrea('CASCADE')


def downgrade() -> None:
    _ricrea(None)

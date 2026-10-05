"""add budget history

Revision ID: d9e3a5b7c2f4
Revises: b8d2f4a6c1e3
Create Date: 2026-10-05 10:00:00.000000

Il budget dei mesi passati. Fino a qui si conservava solo quello attuale, e
cambiarlo riscriveva anche l'avanzo dei mesi gia' chiusi.

Chi ha gia' un budget riceve una riga di partenza: per il passato non si sa
quanto valesse, quindi si usa quello di oggi a partire dalla prima spesa
(o dalla registrazione, per chi non ne ha). Da qui in avanti i valori sono esatti.
"""
from datetime import date
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd9e3a5b7c2f4'
down_revision: Union[str, Sequence[str], None] = 'b8d2f4a6c1e3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    storico = op.create_table(
        'budget_history',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('amount', sa.Float(), nullable=True),
        sa.Column('valid_from', sa.Date(), nullable=False),
    )
    op.create_index('ix_budget_history_user_id', 'budget_history', ['user_id'])

    conn = op.get_bind()
    utenti = conn.execute(sa.text(
        "SELECT u.id, u.monthly_budget, u.created_at, "
        "(SELECT MIN(e.date) FROM expenses e WHERE e.user_id = u.id) "
        "FROM users u WHERE u.monthly_budget IS NOT NULL"
    )).fetchall()
    righe = []
    for user_id, budget, creato, prima_spesa in utenti:
        candidati = [d for d in (prima_spesa, creato.date() if creato else None) if d is not None]
        righe.append({"user_id": user_id, "amount": budget, "valid_from": min(candidati) if candidati else date.today()})
    if righe:
        op.bulk_insert(storico, righe)


def downgrade() -> None:
    op.drop_index('ix_budget_history_user_id', table_name='budget_history')
    op.drop_table('budget_history')

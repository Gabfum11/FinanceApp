"""add refresh_tokens table

Revision ID: b7e2c9d41a56
Revises: a1c4e7f20b93
Create Date: 2026-09-29 18:00:00.000000

Il token di accesso diventa breve: per non rifare il login ogni pochi minuti,
il client lo rinnova con un refresh token. Questi vanno salvati lato server,
a differenza dei JWT, perche' devono poter essere revocati uno per uno
(logout del singolo dispositivo) e riconosciuti se riusati (furto).

Si salva solo l'hash del token, mai il token stesso.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b7e2c9d41a56'
down_revision: Union[str, Sequence[str], None] = 'a1c4e7f20b93'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'refresh_tokens',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('token_hash', sa.String(), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_refresh_tokens_user_id', 'refresh_tokens', ['user_id'])
    op.create_index('ix_refresh_tokens_token_hash', 'refresh_tokens', ['token_hash'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_refresh_tokens_token_hash', table_name='refresh_tokens')
    op.drop_index('ix_refresh_tokens_user_id', table_name='refresh_tokens')
    op.drop_table('refresh_tokens')

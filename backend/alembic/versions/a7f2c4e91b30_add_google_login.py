"""add google_id and make hashed_password nullable

Revision ID: a7f2c4e91b30
Revises: b18351d5113b
Create Date: 2026-09-21 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a7f2c4e91b30'
down_revision: Union[str, Sequence[str], None] = 'b18351d5113b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('google_id', sa.String(), nullable=True))
    op.create_index(op.f('ix_users_google_id'), 'users', ['google_id'], unique=True)
    # chi accede solo con Google non ha una password da conservare
    op.alter_column('users', 'hashed_password', existing_type=sa.String(), nullable=True)


def downgrade() -> None:
    """Downgrade schema."""
    # il ripristino fallisce se esistono utenti senza password: vanno rimossi prima
    op.alter_column('users', 'hashed_password', existing_type=sa.String(), nullable=False)
    op.drop_index(op.f('ix_users_google_id'), table_name='users')
    op.drop_column('users', 'google_id')

"""add tutorial_visto to users

Revision ID: f1a9b3c5d7e2
Revises: c4d8e2a7f915
Create Date: 2026-10-01 12:00:00.000000

Il tutorial di primo avvio era segnato come visto sul telefono: un account
nuovo creato su un telefono dove qualcuno l'aveva gia' visto non lo vedeva mai.
Sul server vale per l'account, da qualsiasi dispositivo.

server_default false: gli utenti esistenti senza budget lo vedono una volta.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f1a9b3c5d7e2'
down_revision: Union[str, Sequence[str], None] = 'c4d8e2a7f915'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('tutorial_visto', sa.Boolean(), nullable=False, server_default='false'))


def downgrade() -> None:
    op.drop_column('users', 'tutorial_visto')

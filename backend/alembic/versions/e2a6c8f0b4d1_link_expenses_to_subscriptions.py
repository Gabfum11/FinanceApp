"""link expenses to the subscription that generated them

Revision ID: e2a6c8f0b4d1
Revises: d9e3a5b7c2f4
Create Date: 2026-10-05 18:00:00.000000

Ogni spesa nata da un rinnovo ricorda il suo abbonamento: rinominandolo, o
cambiandone la categoria, si aggiornano anche le spese gia' registrate.

Le spese esistenti si collegano solo quando e' sicuro: stesso utente, stessa
descrizione, stessa categoria e stesso importo (nella stessa valuta) di un
abbonamento, e nessun altro abbonamento che corrisponda. Nel dubbio la spesa
resta scollegata: meglio non rinominarla che rinominare quella sbagliata.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'e2a6c8f0b4d1'
down_revision: Union[str, Sequence[str], None] = 'd9e3a5b7c2f4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('expenses', sa.Column('subscription_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_expenses_subscription_id', 'expenses', 'subscriptions',
        ['subscription_id'], ['id'], ondelete='SET NULL',
    )
    op.create_index('ix_expenses_subscription_id', 'expenses', ['subscription_id'])

    conn = op.get_bind()
    abbonamenti = conn.execute(sa.text(
        "SELECT id, user_id, description, category_id, amount, currency FROM subscriptions"
    )).fetchall()
    spese = conn.execute(sa.text(
        "SELECT id, user_id, description, category_id, amount, original_amount, original_currency FROM expenses"
    )).fetchall()

    def impronta(user_id, descrizione, categoria, importo, valuta):
        return (user_id, descrizione, categoria, round(importo, 2), valuta)

    #quanti abbonamenti hanno ciascuna impronta: solo le impronte uniche collegano
    per_impronta: dict = {}
    for sub_id, user_id, descrizione, categoria, importo, valuta in abbonamenti:
        per_impronta.setdefault(impronta(user_id, descrizione, categoria, importo, valuta), []).append(sub_id)

    for spesa_id, user_id, descrizione, categoria, importo, originale, valuta_originale in spese:
        #una spesa in valuta estera si confronta con la sua cifra vera
        if valuta_originale:
            chiave = impronta(user_id, descrizione, categoria, originale, valuta_originale)
        else:
            chiave = impronta(user_id, descrizione, categoria, importo, None)
        candidati = per_impronta.get(chiave, [])
        if len(candidati) == 1:
            conn.execute(
                sa.text("UPDATE expenses SET subscription_id = :sub WHERE id = :spesa"),
                {"sub": candidati[0], "spesa": spesa_id},
            )


def downgrade() -> None:
    op.drop_index('ix_expenses_subscription_id', table_name='expenses')
    op.drop_constraint('fk_expenses_subscription_id', 'expenses', type_='foreignkey')
    op.drop_column('expenses', 'subscription_id')

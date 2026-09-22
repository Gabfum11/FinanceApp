"""add parent_id to categories and populate the hierarchy

Revision ID: c3b8e5d21f47
Revises: a7f2c4e91b30
Create Date: 2026-09-22 12:00:00.000000

Le categorie diventano a due livelli: gruppi (parent_id NULL) e sottocategorie.
Le spese puntano sempre a una sottocategoria, mai a un gruppo, così i totali
non sono mai ambigui.

Le categorie già presenti vengono riusate come gruppi dove il nome coincide:
le spese esistenti resterebbero altrimenti orfane.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c3b8e5d21f47'
down_revision: Union[str, Sequence[str], None] = 'a7f2c4e91b30'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# gruppo -> [(sottocategoria, keywords)]
GERARCHIA = {
    "Cibo e bevande": [
        ("Cibo e bevande (generico)", None),
        ("Spesa alimentare", "supermercato,esselunga,conad,coop,lidl,carrefour,spesa"),
        ("Pranzi e cene", "ristorante,pizzeria,pizza,trattoria,sushi,cena,pranzo"),
        ("Bar e caffè", "bar,caffè,caffe,colazione,aperitivo,brioche"),
    ],
    "Acquisti": [
        ("Acquisti (generico)", None),
        ("Abbigliamento", "vestiti,abbigliamento,zara,h&m,maglia,pantaloni,giacca"),
        ("Scarpe", "scarpe,sneakers,stivali,sandali"),
        ("Tecnologia", "telefono,computer,pc,cuffie,tablet,elettronica,mediaworld"),
        ("Regali", "regalo,compleanno,natale,anniversario"),
        ("Tabacchi", "sigarette,tabacchi,tabaccheria"),
    ],
    "Trasporti": [
        ("Trasporti (generico)", None),
        ("Carburante", "benzina,diesel,gasolio,carburante,distributore,rifornimento"),
        ("Mezzi pubblici", "treno,autobus,bus,metro,tram,biglietto,taxi"),
        ("Automobile", "meccanico,tagliando,gomme,revisione,officina"),
        ("Assicurazione auto", "assicurazione,rc auto,polizza auto"),
        ("Parcheggi e pedaggi", "parcheggio,pedaggio,autostrada,telepass,strisce blu"),
    ],
    "Casa": [
        ("Casa (generico)", "casa,arredamento,mobili,ikea"),
        ("Affitto o mutuo", "affitto,mutuo,rata casa"),
        ("Bolletta energia", "luce,gas,enel,energia,bolletta luce,eni"),
        ("Bolletta acqua", "acqua,bolletta acqua,acquedotto"),
        ("Bolletta rifiuti", "rifiuti,tari,spazzatura"),
        ("Internet e telefono", "internet,adsl,fibra,telefono,tim,vodafone,wind,iliad"),
        ("Spese condominiali", "condominio,spese condominiali,amministratore"),
    ],
    "Salute": [
        ("Salute (generico)", "salute,analisi,ospedale"),
        ("Visite mediche", "medico,dottore,visita,dentista,specialista"),
        ("Farmacia", "farmacia,medicine,medicinali,farmaco"),
    ],
    "Cura personale": [
        ("Cura personale (generico)", "cura personale,profumeria"),
        ("Parrucchiere", "parrucchiere,barbiere,taglio capelli"),
        ("Estetista", "estetista,centro estetico,manicure,massaggio"),
    ],
    "Svago": [
        ("Svago (generico)", "svago,divertimento,pub,concerto,discoteca"),
        ("Libri e giornali", "libro,libri,giornale,rivista,libreria,quotidiano"),
        ("Cinema e spettacoli", "cinema,teatro,spettacolo,museo,mostra"),
        ("Abbonamenti digitali", "netflix,spotify,disney,prime video,dazn,abbonamento streaming"),
    ],
    "Sport": [
        ("Sport (generico)", "sport,calcio,tennis,corsa,piscina,partita"),
        ("Palestra", "palestra,abbonamento palestra,fitness"),
        ("Attrezzatura sportiva", "attrezzatura,decathlon,scarpe da corsa,tuta"),
    ],
    "Viaggi": [
        ("Viaggi (generico)", "viaggio,vacanza,valigia,escursione"),
        ("Alloggio", "hotel,albergo,booking,airbnb,bed and breakfast,ostello"),
        ("Trasporti viaggio", "volo,aereo,ryanair,easyjet,traghetto"),
    ],
    "Famiglia": [
        ("Famiglia (generico)", "famiglia"),
        ("Bambini", "bambini,asilo,pannolini,giocattoli,babysitter"),
        ("Istruzione", "scuola,università,universita,corso,tasse universitarie,retta"),
    ],
    "Animali": [
        ("Animali (generico)", "animali,petshop,toelettatura"),
        ("Cibo animali", "cibo per cani,cibo per gatti,crocchette,mangime"),
        ("Veterinario", "veterinario,vaccino animale"),
    ],
    #il gruppo "Altro" raccoglie sia il fallback della classificazione sia le
    #vecchie categorie che non rientrano nella nuova struttura
    "Altro": [
        ("Altro (generico)", None),
    ],
}

#categorie già in uso da riutilizzare come gruppo invece di duplicarle
RINOMINA_GRUPPI = {
    "Cibo": "Cibo e bevande",
    "Shopping": "Acquisti",
}


def upgrade() -> None:
    op.add_column('categories', sa.Column('parent_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_categories_parent', 'categories', 'categories', ['parent_id'], ['id'])

    conn = op.get_bind()
    esistenti = {
        nome: id_ for id_, nome in conn.execute(sa.text("SELECT id, name FROM categories")).fetchall()
    }

    #le categorie in uso diventano gruppi: rinominarle preserva le spese collegate
    for vecchio, nuovo in RINOMINA_GRUPPI.items():
        if vecchio in esistenti and nuovo not in esistenti:
            conn.execute(
                sa.text("UPDATE categories SET name = :nuovo, keywords = NULL WHERE id = :id"),
                {"nuovo": nuovo, "id": esistenti[vecchio]},
            )
            esistenti[nuovo] = esistenti.pop(vecchio)

    for gruppo, sottocategorie in GERARCHIA.items():
        if gruppo in esistenti:
            gruppo_id = esistenti[gruppo]
            #un gruppo non porta keywords: la classificazione avviene sulle foglie
            conn.execute(
                sa.text("UPDATE categories SET keywords = NULL, parent_id = NULL WHERE id = :id"),
                {"id": gruppo_id},
            )
        else:
            gruppo_id = conn.execute(
                sa.text("INSERT INTO categories (name, keywords, parent_id) VALUES (:n, NULL, NULL) RETURNING id"),
                {"n": gruppo},
            ).scalar()
            esistenti[gruppo] = gruppo_id

        for nome, keywords in sottocategorie:
            if nome in esistenti:
                conn.execute(
                    sa.text("UPDATE categories SET parent_id = :p, keywords = :k WHERE id = :id"),
                    {"p": gruppo_id, "k": keywords, "id": esistenti[nome]},
                )
            else:
                conn.execute(
                    sa.text("INSERT INTO categories (name, keywords, parent_id) VALUES (:n, :k, :p)"),
                    {"n": nome, "k": keywords, "p": gruppo_id},
                )

    #le vecchie categorie rimaste senza posto diventano sottocategorie di Altro:
    #cancellarle lascerebbe orfane le spese che vi puntano
    altro_gruppo_id = esistenti["Altro"]
    conn.execute(
        sa.text("""
            UPDATE categories SET parent_id = :altro
            WHERE parent_id IS NULL AND id != :altro AND id NOT IN (
                SELECT DISTINCT parent_id FROM categories WHERE parent_id IS NOT NULL
            )
        """),
        {"altro": altro_gruppo_id},
    )

    #le categorie preesistenti sono diventate gruppi, ma le spese continuavano a
    #puntarvi: le spostiamo sul generico del gruppo, altrimenti resterebbe proprio
    #l'ambiguita' che la gerarchia doveva eliminare
    conn.execute(
        sa.text("""
            UPDATE expenses SET category_id = (
                SELECT figlia.id FROM categories figlia
                WHERE figlia.parent_id = expenses.category_id
                  AND figlia.name LIKE '%(generico)'
                LIMIT 1
            )
            WHERE category_id IN (
                SELECT id FROM categories WHERE parent_id IS NULL
            )
            AND EXISTS (
                SELECT 1 FROM categories figlia
                WHERE figlia.parent_id = expenses.category_id
                  AND figlia.name LIKE '%(generico)'
            )
        """)
    )
    #stesso trattamento per gli abbonamenti, che hanno anch'essi una categoria
    conn.execute(
        sa.text("""
            UPDATE subscriptions SET category_id = (
                SELECT figlia.id FROM categories figlia
                WHERE figlia.parent_id = subscriptions.category_id
                  AND figlia.name LIKE '%(generico)'
                LIMIT 1
            )
            WHERE category_id IN (
                SELECT id FROM categories WHERE parent_id IS NULL
            )
            AND EXISTS (
                SELECT 1 FROM categories figlia
                WHERE figlia.parent_id = subscriptions.category_id
                  AND figlia.name LIKE '%(generico)'
            )
        """)
    )


def downgrade() -> None:
    conn = op.get_bind()
    #le sottocategorie inserite qui non esistevano prima: le spese che vi puntano
    #verrebbero orfane, quindi si torna indietro solo sullo schema
    conn.execute(sa.text("UPDATE categories SET parent_id = NULL"))
    op.drop_constraint('fk_categories_parent', 'categories', type_='foreignkey')
    op.drop_column('categories', 'parent_id')

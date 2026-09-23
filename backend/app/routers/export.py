"""Esportazione dei dati dell'utente in CSV.

Oltre all'utilità pratica (chi tiene i conti li vuole in Excel), risponde al
diritto di portabilità previsto dall'art. 20 del GDPR: l'utente deve poter
ottenere i propri dati in un formato leggibile da macchina.
"""
import csv
import io
from datetime import date

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app import models
from app.business_logic import security
from app.routers.subscriptions import run_due_renewals

router = APIRouter(prefix="/export", tags=["export"])

#Excel in italiano si aspetta il punto e virgola: con la virgola metterebbe
#tutta la riga in una sola colonna
SEPARATORE = ";"

#senza BOM Excel legge "Caffè" come "CaffÃ¨"
BOM = "﻿"

FREQUENZE = {"monthly": "Mensile", "weekly": "Settimanale", "yearly": "Annuale"}


def _scrivi_csv(intestazioni: list[str], righe: list[list]) -> str:
    buffer = io.StringIO()
    writer = csv.writer(buffer, delimiter=SEPARATORE, lineterminator="\r\n")
    writer.writerow(intestazioni)
    writer.writerows(righe)
    return BOM + buffer.getvalue()


def _importo(valore: float) -> str:
    #virgola decimale, come si aspetta Excel italiano: il separatore di colonna
    #è il punto e virgola, quindi non c'è ambiguità
    return f"{valore:.2f}".replace(".", ",")


def _risposta_csv(contenuto: str, nome_file: str) -> StreamingResponse:
    return StreamingResponse(
        iter([contenuto]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{nome_file}"'},
    )


@router.get("/expenses.csv")
def export_expenses(db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_user)):
    #i rinnovi scaduti diventano spese: l'export deve contenerli
    run_due_renewals(db, current_user.id)

    spese = (
        db.query(models.Expense)
        .filter(models.Expense.user_id == current_user.id)
        .order_by(models.Expense.date.desc(), models.Expense.id.desc())
        .all()
    )

    righe = []
    for spesa in spese:
        categoria = spesa.category
        righe.append([
            spesa.date.isoformat(),
            spesa.description,
            _importo(spesa.amount),
            categoria.name if categoria else "",
            categoria.parent.name if categoria and categoria.parent else "",
        ])

    contenuto = _scrivi_csv(
        ["Data", "Descrizione", "Importo", "Categoria", "Gruppo"], righe
    )
    return _risposta_csv(contenuto, f"trackit-spese-{date.today().isoformat()}.csv")


@router.get("/subscriptions.csv")
def export_subscriptions(db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_user)):
    abbonamenti = (
        db.query(models.Subscriptions)
        .filter(models.Subscriptions.user_id == current_user.id)
        .order_by(models.Subscriptions.description)
        .all()
    )

    righe = []
    for sub in abbonamenti:
        categoria = sub.category
        righe.append([
            sub.description,
            _importo(sub.amount),
            FREQUENZE.get(sub.frequency, sub.frequency),
            sub.next_date.isoformat(),
            "Attivo" if sub.is_active else "In pausa",
            "Automatico" if sub.auto_renew else "Manuale",
            categoria.name if categoria else "",
            categoria.parent.name if categoria and categoria.parent else "",
        ])

    contenuto = _scrivi_csv(
        ["Descrizione", "Importo", "Frequenza", "Prossimo addebito",
         "Stato", "Rinnovo", "Categoria", "Gruppo"],
        righe,
    )
    return _risposta_csv(contenuto, f"trackit-abbonamenti-{date.today().isoformat()}.csv")

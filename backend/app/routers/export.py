"""Esportazione dei dati dell'utente in CSV.

Oltre all'utilità pratica (chi tiene i conti li vuole in Excel), risponde al
diritto di portabilità previsto dall'art. 20 del GDPR: l'utente deve poter
ottenere i propri dati in un formato leggibile da macchina.

Intestazioni, testi e numeri seguono la lingua dell'utente, come li aspetta
Excel in quella lingua.
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
from app.business_logic.testi import lingua_valida, nome_categoria, testo
from app.routers.subscriptions import run_due_renewals

router = APIRouter(prefix="/export", tags=["export"])

#Excel in italiano usa la virgola per i decimali e si aspetta il punto e
#virgola tra le colonne: con la virgola metterebbe tutta la riga in una sola
#colonna. Excel in inglese fa il contrario
SEPARATORI = {"it": ";", "en": ","}
DECIMALI = {"it": ",", "en": "."}

#senza BOM Excel legge "Caffè" come "CaffÃ¨"
BOM = "﻿"


def _scrivi_csv(lingua: str, intestazioni: list[str], righe: list[list]) -> str:
    buffer = io.StringIO()
    writer = csv.writer(buffer, delimiter=SEPARATORI[lingua], lineterminator="\r\n")
    writer.writerow(intestazioni)
    writer.writerows(righe)
    return BOM + buffer.getvalue()


def _importo(valore: float, lingua: str) -> str:
    #il separatore di colonna e' diverso da quello dei decimali: nessuna ambiguita'
    return f"{valore:.2f}".replace(".", DECIMALI[lingua])


def _categoria_e_gruppo(categoria: models.Category | None, lingua: str) -> list[str]:
    if categoria is None:
        return ["", ""]
    gruppo = categoria.parent.name if categoria.parent else None
    return [nome_categoria(categoria.name, lingua), nome_categoria(gruppo, lingua) if gruppo else ""]


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
    lingua = lingua_valida(current_user.language)

    spese = (
        db.query(models.Expense)
        .filter(models.Expense.user_id == current_user.id)
        .order_by(models.Expense.date.desc(), models.Expense.id.desc())
        .all()
    )

    righe = []
    for spesa in spese:
        righe.append([
            spesa.date.isoformat(),
            spesa.description,
            _importo(spesa.amount, lingua),
            #pagata in un'altra valuta: la cifra vera accanto a quella convertita
            _importo(spesa.original_amount, lingua) if spesa.original_currency else "",
            spesa.original_currency or "",
            *_categoria_e_gruppo(spesa.category, lingua),
        ])

    contenuto = _scrivi_csv(lingua, [
        testo(lingua, "csv_data"),
        testo(lingua, "csv_descrizione"),
        testo(lingua, "csv_importo_valuta", valuta=current_user.currency),
        testo(lingua, "csv_importo_originale"),
        testo(lingua, "csv_valuta_originale"),
        testo(lingua, "csv_categoria"),
        testo(lingua, "csv_gruppo"),
    ], righe)
    return _risposta_csv(contenuto, f"trackit-{testo(lingua, 'file_spese')}-{date.today().isoformat()}.csv")


@router.get("/subscriptions.csv")
def export_subscriptions(db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_user)):
    lingua = lingua_valida(current_user.language)
    abbonamenti = (
        db.query(models.Subscriptions)
        .filter(models.Subscriptions.user_id == current_user.id)
        .order_by(models.Subscriptions.description)
        .all()
    )

    righe = []
    for sub in abbonamenti:
        righe.append([
            sub.description,
            _importo(sub.amount, lingua),
            #un abbonamento puo' avere il prezzo in un'altra valuta
            sub.currency or current_user.currency,
            testo(lingua, f"csv_frequenza_{sub.frequency}") if sub.frequency in ("monthly", "weekly", "yearly") else sub.frequency,
            sub.next_date.isoformat(),
            testo(lingua, "csv_attivo") if sub.is_active else testo(lingua, "csv_in_pausa"),
            testo(lingua, "csv_automatico") if sub.auto_renew else testo(lingua, "csv_manuale"),
            *_categoria_e_gruppo(sub.category, lingua),
        ])

    contenuto = _scrivi_csv(lingua, [
        testo(lingua, "csv_descrizione"),
        testo(lingua, "csv_importo"),
        testo(lingua, "csv_valuta"),
        testo(lingua, "csv_frequenza"),
        testo(lingua, "csv_prossimo"),
        testo(lingua, "csv_stato"),
        testo(lingua, "csv_rinnovo"),
        testo(lingua, "csv_categoria"),
        testo(lingua, "csv_gruppo"),
    ], righe)
    return _risposta_csv(contenuto, f"trackit-{testo(lingua, 'file_abbonamenti')}-{date.today().isoformat()}.csv")

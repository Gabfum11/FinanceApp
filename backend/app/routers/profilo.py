"""Le impostazioni dell'account: budget, password, profilo, preferenze, notifiche.

Stesso prefisso /auth di auth.py, che invece si occupa solo dell'accesso:
gli indirizzi chiamati dall'app non cambiano.
"""
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.business_logic import security, valuta_estera
from app.business_logic.cambi import CambioNonDisponibile
from app.business_logic.oggi import oggi
from app.business_logic.budget import get_budget_cycle, registra_budget
from app.routers.auth import _session_tokens

router = APIRouter(prefix="/auth", tags=["profilo"])


@router.patch("/updateBudget", response_model=schemas.BudgetData)
def update_budget_settings(settings: schemas.BudgetData, db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_user), giorno: date = Depends(oggi)):
    current_user.monthly_budget = settings.monthly_budget
    current_user.budget_start_day = settings.budget_start_day
    #anche nello storico: i mesi gia' chiusi restano con il budget che avevano
    cycle_start, _ = get_budget_cycle(giorno, settings.budget_start_day)
    registra_budget(db, current_user.id, settings.monthly_budget, giorno, cycle_start)
    db.commit()
    return {"monthly_budget": current_user.monthly_budget, "budget_start_day": current_user.budget_start_day}

@router.patch("/change-password")
def change_password(data: schemas.ChangePassword, db:Session=Depends(get_db), current_user: models.User=Depends(security.get_current_user)):
    if current_user.hashed_password is None:
        #senza questo messaggio l'utente Google vedrebbe "password attuale errata"
        raise HTTPException(status_code=400, detail="Questo account accede con Google e non ha una password")
    if not security.verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    current_user.hashed_password = security.hash_password(data.new_password)
    #chi avesse rubato un token resterebbe dentro con la password vecchia:
    #la revoca chiude i rinnovi, l'incremento i token di accesso gia' emessi
    security.revoke_all_refresh_tokens(db, current_user.id)
    current_user.token_version += 1
    db.commit()
    db.refresh(current_user)
    #chi ha cambiato la password verrebbe disconnesso dalla propria revoca:
    #gli diamo subito una sessione nuova
    return {
        "detail": "Password aggiornata con successo",
        **_session_tokens(db, current_user),
    }

@router.patch("/updateProfile")
def update_profile(nickname : schemas.UpdateProfile, db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_user)):
    current_user.nickname = nickname.nickname
    db.commit()
    return {"nickname": current_user.nickname}

@router.put("/push-token")
def set_push_token(payload: schemas.PushToken, db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_user)):
    """Registra il telefono che riceve i promemoria dell'utente.

    PUT perche' imposta un valore: l'app lo richiama a ogni apertura senza
    effetti collaterali, e se il token cambia l'ultimo sovrascrive il precedente.
    """
    #stesso telefono, account diverso (logout e login con un altro utente):
    #il token va tolto al vecchio account, altrimenti i suoi promemoria
    #arriverebbero a chi usa il telefono adesso
    db.query(models.User).filter(
        models.User.push_token == payload.token,
        models.User.id != current_user.id,
    ).update({models.User.push_token: None})

    current_user.push_token = payload.token
    db.commit()
    return {"detail": "Dispositivo registrato per le notifiche"}

@router.patch("/preferences", response_model=schemas.UserOut)
def update_preferences(preferences: schemas.UpdatePreferences, db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_user), giorno: date = Depends(oggi)):
    """Valuta e lingua dell'utente, scelte dal Profilo.

    PATCH: arriva solo quello che cambia. Restituisce l'utente aggiornato, cosi'
    l'app riparte dai valori salvati invece di fidarsi di quelli che ha mandato.
    """
    if preferences.currency is not None and preferences.currency != current_user.currency:
        if preferences.convert_history:
            try:
                valuta_estera.converti_storico(db, current_user, preferences.currency, giorno)
            except CambioNonDisponibile:
                #niente a meta': o tutto convertito o tutto com'era
                db.rollback()
                raise HTTPException(status_code=503, detail="Exchange rate unavailable")
        else:
            #i numeri restano gli stessi: un abbonamento con il prezzo nella nuova
            #valuta torna semplicemente "nella valuta dell'utente"
            db.query(models.Subscriptions).filter(
                models.Subscriptions.user_id == current_user.id,
                models.Subscriptions.currency == preferences.currency,
            ).update({models.Subscriptions.currency: None})
        current_user.currency = preferences.currency
    if preferences.language is not None:
        current_user.language = preferences.language
    db.commit()
    db.refresh(current_user)
    return current_user

@router.put("/tutorial-visto")
def set_tutorial_visto(db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_user)):
    """Il tutorial di primo avvio e' stato completato o saltato.

    PUT perche' imposta un valore: richiamarlo una seconda volta non cambia nulla.
    """
    current_user.tutorial_visto = True
    db.commit()
    return {"detail": "Tutorial segnato come visto"}

@router.delete("/push-token")
def delete_push_token(db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_user)):
    """Promemoria spenti o logout: il telefono smette di ricevere le push."""
    current_user.push_token = None
    db.commit()
    return {"detail": "Notifiche disattivate per questo dispositivo"}

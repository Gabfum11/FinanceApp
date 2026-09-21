from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.state import limiter
from app.business_logic import security, email_service, google_auth
from fastapi.security import OAuth2PasswordRequestForm
from datetime import datetime, timedelta, timezone
router = APIRouter(prefix="/auth", tags=["auth"])
MAX_OTP_ATTEMPTS = 5  # Numero massimo di tentativi consentiti per l'inserimento del codice OTP

#response model dice a FastAPI che qualunque cosa la funzione restituisca, formattala secondo questo schema pydantic prima di mandarla al client
@router.post("/register", response_model=schemas.UserOut)
@limiter.limit("5/hour") #per impedire che qualcuno faccia richieste di registrazione a raffica, limitando a 5 richieste per ora per IP
async def register(request:Request, user: schemas.UserCreate, db: Session = Depends(get_db)):
    #user sono dati inseriti dall'utente validati  e trasformati in un oggetto python
    normalized_email=user.email.strip().lower()
    existing_user = db.query(models.User).filter(models.User.email == normalized_email).first()
    if existing_user is not None:
        if  existing_user.is_verified:
            raise HTTPException(status_code=400, detail="Email already registered")
        else:
            db.query(models.OtpCode).filter(models.OtpCode.user_id==existing_user.id).delete()
            db.delete(existing_user)
            db.commit()

    new_user = models.User(
        email=normalized_email,
        hashed_password=security.hash_password(user.password),
        nickname=user.nickname,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    otp_code=email_service.generate_otp_code()
    expire_at=datetime.now(timezone.utc) + timedelta(minutes=10)
    new_otp= models.OtpCode(
        user_id=new_user.id,
        code=otp_code,
        purpose="email_verification",
        expires_at=expire_at,
    )
    db.add(new_otp)
    db.commit()
    db.refresh(new_otp)
    await email_service.send_otp_email(normalized_email,otp_code, purpose="email_verification")
    return new_user

@router.post("/verify-otp", response_model=schemas.Token)
@limiter.limit("10/5minutes")
async def verify_otp(request: Request, verify: schemas.VerifyEmail, db: Session=Depends(get_db)):
    #il codice NON va filtrato qui: serve trovare l'OTP dell'utente anche quando
    #sbaglia, altrimenti il conteggio dei tentativi non verrebbe mai incrementato
    otp=db.query(models.OtpCode).join(models.User).filter(
        models.User.email==verify.email, #serve a verificare che sia di quell'utente
        models.OtpCode.purpose==verify.purpose,
        models.OtpCode.user_id==models.User.id,
    ).order_by(models.OtpCode.created_at.desc()).first() #il piu' recente, se ne restasse piu' di uno
    if otp is None:
        raise HTTPException(status_code=401,detail="Invalid code")
    if otp.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="code Expired")
    if otp.attempts >= MAX_OTP_ATTEMPTS:
        raise HTTPException(status_code=401, detail="Too many attempts")
    if otp.code != verify.code:
        otp.attempts += 1
        db.commit()
        raise HTTPException(status_code=401, detail="Invalid code")
    if otp.purpose=="email_verification":
        data={"sub":str(otp.user_id)} #sub indica il soggetto a cui si riferisce il token
        otp.user.is_verified=True 
    else:
        data={"sub": str(otp.user_id), "purpose": "password_reset"}
    access_token=security.create_access_token(data)
    db.query(models.OtpCode).filter(models.OtpCode.user_id==otp.user_id).delete()
    db.commit()
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login", response_model=schemas.Token)
@limiter.limit("5/minute")
def login(request: Request, credentials: schemas.UserLogin, db: Session=Depends(get_db)):
    normalized_email=credentials.email.strip().lower()
    auth_user=db.query(models.User).filter(models.User.email==normalized_email).first()
    if auth_user is None:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not security.verify_password(credentials.password, auth_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not auth_user.is_verified:
        raise HTTPException(status_code=403,detail="User not verified")
    expires = 60 * 24 * 30 if credentials.remember_me else 60  # 30 giorni vs 1 ora
    data={"sub": str(auth_user.id)}
    access_token=security.create_access_token(data, expires)
    return {"access_token": access_token, "token_type": "bearer"}
    #token_type dice al client come deve usare il token nelle richieste successive
    #in questo caso sarà sempre la stringa fissa bearer, significa che il client deve mandare questo token
    #nell'header HTTP authorization con il formato bearer<token
    #la parola bearer è una convenzione standard, dice al server: sto usando l'autenticazione a token, ecco il mio token

@router.post("/google", response_model=schemas.Token)
@limiter.limit("10/minute")
def login_with_google(request: Request, payload: schemas.GoogleLogin, db: Session = Depends(get_db)):
    try:
        info = google_auth.verify_google_token(payload.id_token)
    except google_auth.GoogleAuthError as e:
        raise HTTPException(status_code=401, detail=str(e))

    auth_user = db.query(models.User).filter(models.User.google_id == info["google_id"]).first()

    if auth_user is None:
        #nessun account con questo google_id: puo' essere un utente registrato
        #in precedenza con email e password. Google ha gia' verificato l'email,
        #quindi colleghiamo i due metodi invece di creare un doppione
        auth_user = db.query(models.User).filter(models.User.email == info["email"]).first()
        if auth_user is not None:
            auth_user.google_id = info["google_id"]
        else:
            auth_user = models.User(
                email=info["email"],
                hashed_password=None, #accede solo con Google
                google_id=info["google_id"],
                nickname=info["name"],
                is_verified=True, #l'email arriva gia' verificata da Google
            )
            db.add(auth_user)
        db.commit()
        db.refresh(auth_user)

    if not auth_user.is_active:
        raise HTTPException(status_code=403, detail="User not active")

    #l'email e' verificata da Google: allineiamo gli account creati prima con password
    if not auth_user.is_verified:
        auth_user.is_verified = True
        db.commit()

    expires = 60 * 24 * 30 if payload.remember_me else 60
    access_token = security.create_access_token({"sub": str(auth_user.id)}, expires)
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/token", response_model=schemas.Token)
@limiter.limit("5/minute")
#oggetto speciale di fastAPI che sa leggere dati inviati come form con due campi fissi: email e password(username è standard)
#i controlli devono restare allineati a /login: altrimenti questo endpoint diventa
#una porta laterale che aggira verifica email e protezione sui tentativi
def login_for_swagger(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    normalized_email=form_data.username.strip().lower()
    auth_user = db.query(models.User).filter(models.User.email == normalized_email).first()
    if auth_user is None or not security.verify_password(form_data.password, auth_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not auth_user.is_verified:
        raise HTTPException(status_code=403, detail="User not verified")

    access_token = security.create_access_token(data={"sub": str(auth_user.id)})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=schemas.UserOut)
def get_me(current_user: models.User = Depends(security.get_current_user)):
    return current_user


@router.delete("/me")
@limiter.limit("5/minute")
#richiesto dalle policy degli app store: l'utente deve poter cancellare il proprio account dall'app.
#La password conferma l'identita': un token rubato da solo non basta a distruggere i dati
def delete_me(request: Request, payload: schemas.DeleteAccount, db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_user)):
    #chi accede solo con Google non ha una password da confermare: pretenderla
    #lo lascerebbe senza alcun modo di cancellare l'account, che le policy
    #degli app store richiedono sia sempre possibile
    if current_user.hashed_password is not None:
        if not security.verify_password(payload.password, current_user.hashed_password):
            raise HTTPException(status_code=401, detail="Invalid credentials")

    #le tabelle collegate non hanno ON DELETE CASCADE: vanno svuotate a mano,
    #prima dell'utente, altrimenti restano righe orfane che puntano a un id inesistente
    user_id = current_user.id
    db.query(models.OtpCode).filter(models.OtpCode.user_id == user_id).delete()
    db.query(models.Subscriptions).filter(models.Subscriptions.user_id == user_id).delete()
    db.query(models.Expense).filter(models.Expense.user_id == user_id).delete()
    #rileggiamo l'utente da questa sessione: current_user puo' arrivare da un'altra
    db.query(models.User).filter(models.User.id == user_id).delete()
    db.commit()
    return {"detail": "Account deleted"}


@router.post("/resendOTP")
@limiter.limit("3/5minutes")
async def resendOTP(request: Request, payload: schemas.ResendOtp, db: Session=Depends(get_db)):
    auth_user=db.query(models.User).filter(models.User.email==payload.email).first()
    if auth_user is not None:
        db.query(models.OtpCode).filter(
            models.OtpCode.user_id == auth_user.id,
            models.OtpCode.purpose == payload.purpose
        ).delete()
        otp_code=email_service.generate_otp_code()
        expire_at=datetime.now(timezone.utc) + timedelta(minutes=10)
        new_otp= models.OtpCode(
            user_id=auth_user.id,
            code=otp_code,
            purpose=payload.purpose,
            expires_at=expire_at,
        )
        db.add(new_otp)
        db.commit()
        db.refresh(new_otp)
        try:
            await email_service.send_otp_email(payload.email,otp_code, purpose=payload.purpose)
        except Exception as e:
            print(f"Errore nell'invio dell'otp a {payload.email}: {e}")
    return{"detail":"Se l'account esiste, ricevereai un codice via mail"}

@router.post("/resetPassword")
async def resetPassword(passw:schemas.ResetPassword,db:Session=Depends(get_db),user:str=Depends(security.get_reset_password_user)):
    user.hashed_password=security.hash_password(passw.new_password)
    db.commit()
    return {"detail": "Password aggiornata con successo"}


@router.patch("/updateBudget", response_model=schemas.BuddgetDate)
def update_budget_settings(settings: schemas.BuddgetDate, db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_user)):
    current_user.monthly_budget = settings.monthly_budget
    current_user.budget_start_day = settings.budget_start_day
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
    db.commit()
    return {"detail": "Password aggiornata con successo"}

@router.patch("/updateProfile")
def update_profile(nickname: str, db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_user)):
    current_user.nickname = nickname
    db.commit()
    return {"nickname": current_user.nickname}
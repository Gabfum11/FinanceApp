from passlib.context import CryptContext #classe che gestisce l'hashing
import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
#con questa chiave si firmano i token: chi la conosce puo' fabbricarne uno per
#qualsiasi utente, senza password. Deve restare nelle variabili d'ambiente.
SECRET_KEY = os.getenv("SECRET_KEY")

#lunghezza minima ragionevole per una chiave HS256: sotto, diventa indovinabile
MIN_SECRET_KEY_LENGTH = 32

#valori da esempio o segnaposto: se finissero in produzione la firma sarebbe
#riproducibile da chiunque conosca il progetto
WEAK_SECRET_KEYS = {
    "secret", "secretkey", "secret_key", "changeme", "change-me",
    "password", "test", "development", "dev", "your-secret-key",
}


def _validate_secret_key(key: str | None) -> str:
    """Interrompe l'avvio dell'app se la chiave manca o e' debole 
    se la chiave è debole significa che è stata lasciata quella di esempio, e chiunque può generare token validi per qualsiasi utente.
    os.getenv restituisce None senza protestare: l'app partirebbe, /health
    risponderebbe OK, e il fallimento arriverebbe al primo login con un errore
    incomprensibile. Meglio non partire affatto, con un messaggio chiaro.
    """
    if not key:
        raise RuntimeError(
            "SECRET_KEY non impostata. Senza, i token non possono essere firmati: "
            "aggiungila alle variabili d'ambiente (backend/.env in locale, "
            "pannello Environment su Render)."
        )
    if key.strip().lower() in WEAK_SECRET_KEYS:
        raise RuntimeError(
            "SECRET_KEY ha un valore da esempio. Generane una casuale con: "
            "python -c \"import secrets; print(secrets.token_hex(32))\""
        )
    if len(key) < MIN_SECRET_KEY_LENGTH:
        raise RuntimeError(
            f"SECRET_KEY troppo corta ({len(key)} caratteri, minimo {MIN_SECRET_KEY_LENGTH}). "
            "Generane una con: python -c \"import secrets; print(secrets.token_hex(32))\""
        )
    return key


SECRET_KEY = _validate_secret_key(SECRET_KEY) #la chiave è stata generata con python -c "import secrets; print(secrets.token_hex(32))" e salvata in backend/.env
ALGORITHM = "HS256"
#breve di proposito: un token rubato vale pochi minuti. La sessione dura di
#piu' grazie al refresh token, che il client scambia per uno nuovo
ACCESS_TOKEN_EXPIRE_MINUTES = 15
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


def hash_password(password: str): 
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str): #plain_password è la password che l'utente ha inserito, hashed_password è quella salvata nel db
    return pwd_context.verify(plain_password, hashed_password) #verifica se la password inserita corrisponde a quella salvata nel db, restituendo True o False

def create_access_token(data: dict, expire_minutes:int=ACCESS_TOKEN_EXPIRE_MINUTES):
    to_encode = data.copy() #crea una copia del dizionario dei dati da codificare nel token
    expire = datetime.now(timezone.utc) + timedelta(minutes=expire_minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM) #genera e restituisce il token

def create_user_token(user: models.User, expire_minutes: int = ACCESS_TOKEN_EXPIRE_MINUTES, **extra):
    """Token di accesso per un utente, con la sua versione corrente.

    Da preferire a create_access_token: includere "ver" a mano in ogni punto
    che emette token e' facile da dimenticare, e un token senza versione
    resterebbe valido anche dopo una revoca.
    """
    return create_access_token(
        {"sub": str(user.id), "ver": user.token_version, **extra},
        expire_minutes,
    )


REFRESH_TOKEN_DAYS = 30


def _hash_refresh_token(token: str) -> str:
    #SHA-256 e non argon2: serve un hash deterministico per ritrovare la riga,
    #e un token casuale da 32 byte non si indovina, quindi la lentezza non serve
    return hashlib.sha256(token.encode()).hexdigest()


def create_refresh_token(db: Session, user: models.User) -> str:
    """Emette un refresh token per l'utente e ne salva solo l'hash.

    Il token in chiaro esce da qui una volta sola, verso il client: il server
    non lo conserva e non potrebbe ricostruirlo.
    """
    now = datetime.now(timezone.utc)
    #ogni rinnovo lascia una riga consumata: quelle scadute non servono piu'
    #nemmeno a riconoscere un riuso, perche' verrebbero rifiutate comunque.
    #Pulirle qui impedisce alla tabella di crescere senza limite
    db.query(models.RefreshToken).filter(
        models.RefreshToken.user_id == user.id,
        models.RefreshToken.expires_at < now,
    ).delete()
    token = secrets.token_urlsafe(32)
    db.add(models.RefreshToken(
        user_id=user.id,
        token_hash=_hash_refresh_token(token),
        expires_at=now + timedelta(days=REFRESH_TOKEN_DAYS),
    ))
    db.commit()
    return token


def revoke_all_refresh_tokens(db: Session, user_id: int) -> None:
    """Cancella tutti i refresh token dell'utente, senza commit.

    Va sempre insieme all'incremento di token_version, nello stesso commit:
    questa chiude i rinnovi futuri, l'incremento i token di accesso gia' emessi.
    """
    db.query(models.RefreshToken).filter(models.RefreshToken.user_id == user_id).delete()


def revoke_refresh_token(db: Session, token: str) -> None:
    """Cancella un solo refresh token: e' il logout del dispositivo che lo possiede."""
    db.query(models.RefreshToken).filter(
        models.RefreshToken.token_hash == _hash_refresh_token(token)
    ).delete()
    db.commit()


def rotate_refresh_token(db: Session, token: str) -> tuple[models.User, str]:
    """Consuma il refresh token e ne restituisce uno nuovo, con il suo utente.

    Un token gia' consumato che torna indietro significa che ne esistono due
    copie: quella del client legittimo e quella di chi l'ha rubato. Non sapendo
    quale sia quale, si chiudono tutte le sessioni dell'utente.
    """
    refresh_exception = HTTPException(status_code=401, detail="Invalid refresh token")
    row = db.query(models.RefreshToken).filter(
        models.RefreshToken.token_hash == _hash_refresh_token(token)
    ).first()
    if row is None:
        raise refresh_exception
    now = datetime.now(timezone.utc)
    if row.expires_at < now:
        raise refresh_exception

    #il controllo e la marcatura in un'unica UPDATE: con due richieste
    #contemporanee sullo stesso token, solo una trova used_at ancora vuoto
    consumed = db.query(models.RefreshToken).filter(
        models.RefreshToken.id == row.id,
        models.RefreshToken.used_at.is_(None),
    ).update({"used_at": now}, synchronize_session=False)
    if consumed == 0:
        user = db.query(models.User).filter(models.User.id == row.user_id).first()
        revoke_all_refresh_tokens(db, row.user_id)
        if user is not None:
            user.token_version += 1
        db.commit()
        raise refresh_exception

    user = db.query(models.User).filter(models.User.id == row.user_id).first()
    if user is None or not user.is_active:
        db.rollback()
        raise refresh_exception
    return user, create_refresh_token(db, user)


def decode_access_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token") #schema che sa estrarre il token dall'header


"""
get_current_user fa cinque controlli:
1. Il token e' valido (firma corretta, non scaduto)
2. Il token e' di tipo access (non password_reset)
3. Il token contiene un id utente , questo perchè alcuni token potrebbero non avere un id utente (es. token di reset password)
4. L'utente esiste nel db
5. La versione del token corrisponde a quella dell'utente (revoca)
"""
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.User:
    credentials_exception = HTTPException(status_code=401, detail="Could not validate credentials")
    #il primo depends fa in modo che FastAPI estragga automaticamente il token dall'header Authorization e lo passi come stringa
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    if payload.get("purpose") is not None:
        raise credentials_exception

    user_id = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception

    #il confronto avviene qui, dove l'utente e' gia' stato letto: non costa
    #una query in piu'. I token emessi prima di questa funzione non hanno il
    #campo e valgono 0, come il valore iniziale della colonna
    if payload.get("ver", 0) != user.token_version:
        raise credentials_exception

    return user

def get_current_admin(current_user: models.User = Depends(get_current_user)) -> models.User:
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user
def get_reset_password_user(token:str = Depends(oauth2_scheme), db:Session=Depends(get_db)) ->models.User:
    password_exception=HTTPException(status_code=401, detail="Could not reset password")
    payload=decode_access_token(token)
    if payload is None:
        raise password_exception
    if payload.get("purpose") != "password_reset":
        raise  password_exception
    user_id = payload.get("sub")
    if user_id is None:
        raise password_exception
    user = db.query(models.User).filter(models.User.id == int(user_id)).first()
    if user is None:
        raise password_exception
    #il reset incrementa la versione: un token gia' usato non corrisponde piu',
    #e resta rifiutato anche se non e' ancora scaduto
    if payload.get("ver", 0) != user.token_version:
        raise password_exception

    return user
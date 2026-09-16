from passlib.context import CryptContext #classe che gestisce l'hashing
import os
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


def hash_password(password: str): 
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str): #plain_password è la password che l'utente ha inserito, hashed_password è quella salvata nel db
    return pwd_context.verify(plain_password, hashed_password) #verifica se la password inserita corrisponde a quella salvata nel db, restituendo True o False

def create_access_token(data: dict, expire_minutes:int=ACCESS_TOKEN_EXPIRE_MINUTES):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=expire_minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM) #genera e restituisce il token

def decode_access_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token") #schema che sa estrarre il token dall'header


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
    
    return user
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

load_dotenv()

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(SQLALCHEMY_DATABASE_URL) #avvia la connessione con il database

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine) #produce una nuova sessione legata all'engine

Base = declarative_base() #permette a sqlalchemy di tenere un registro di tutte le tabelle esistenti nell'applicazione


def get_db():
    db = SessionLocal() #crea una nuova sessione
    try:
        yield db #presta la sessione a chi la richiede
    finally:
        db.close() #chiude la sessione

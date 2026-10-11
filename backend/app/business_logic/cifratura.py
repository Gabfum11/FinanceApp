"""Cifratura delle colonne sensibili (descrizioni e budget).

La chiave sta su Render, il database su Supabase: chi apre il database o un suo
backup vede solo testo illeggibile. Il server la decifra quando serve, quindi
budget, statistiche e assistente funzionano come prima.

Fernet mette un valore casuale in ogni cifratura: lo stesso testo esce diverso
ogni volta, per questo le colonne cifrate non si possono cercare, ordinare o
confrontare in SQL. Va fatto in Python, dopo averle lette.
"""
import os

from cryptography.fernet import Fernet
from sqlalchemy.types import Text, TypeDecorator


def _valida_chiave(chiave: str | None) -> Fernet:
    #come per SECRET_KEY: meglio non partire che salvare dati con una chiave sbagliata
    try:
        return Fernet(chiave.strip())
    except (AttributeError, ValueError):
        raise RuntimeError(
            "CHIAVE_CIFRATURA mancante o non valida. Generane una con: "
            "python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\" "
            "e mettila in backend/.env in locale e nel pannello Environment su Render. "
            "Conservane una copia: se si perde, descrizioni e budget non si leggono piu'."
        ) from None


_fernet = _valida_chiave(os.getenv("CHIAVE_CIFRATURA"))


def cifra(valore: str) -> str:
    return _fernet.encrypt(valore.encode()).decode()


def decifra(valore: str) -> str:
    return _fernet.decrypt(valore.encode()).decode()


class TestoCifrato(TypeDecorator):
    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        return None if value is None else cifra(value)

    def process_result_value(self, value, dialect):
        return None if value is None else decifra(value)


class NumeroCifrato(TypeDecorator):
    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        #repr di un float lo ricostruisce identico
        return None if value is None else cifra(repr(float(value)))

    def process_result_value(self, value, dialect):
        return None if value is None else float(decifra(value))

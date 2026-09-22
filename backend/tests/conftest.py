"""Configurazione condivisa dai test.

Ogni test gira su un database SQLite in memoria creato da zero: non tocca mai
il database reale e non lascia residui tra un test e l'altro.
"""
import os
import sys
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, DateTime as SADateTime
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy.types import TypeDecorator

# il pacchetto app sta nella cartella superiore
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# valori fittizi: i test non chiamano mai i servizi esterni davvero
os.environ.setdefault("GROQ_API_KEY", "test-key")
os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("SECRET_KEY", "test-secret-key-non-usata-in-produzione")

from app.database import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402
from app import models  # noqa: E402
from app.business_logic import security  # noqa: E402


class UtcDateTime(TypeDecorator):
    """SQLite non conserva il fuso orario, PostgreSQL sì.

    Senza questo, i confronti tra date "aware" e "naive" sollevano TypeError
    nei test pur funzionando in produzione.
    """

    impl = SADateTime
    cache_ok = True

    def process_result_value(self, value, dialect):
        if value is not None and value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value


models.OtpCode.__table__.c.expires_at.type = UtcDateTime()


@pytest.fixture
def db_session():
    """Database vuoto, nuovo per ogni test."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    def override_get_db():
        db = Session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    # il rate limit conta le richieste per IP: tra i test si accumulerebbero
    app.state.limiter.enabled = False

    yield Session

    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client(db_session):
    return TestClient(app, raise_server_exceptions=False)


@pytest.fixture
def make_user(db_session):
    """Crea un utente e restituisce il suo id."""

    def _make(email="test@example.com", password=None, verified=True, **extra):
        db = db_session()
        user = models.User(
            email=email,
            hashed_password=security.hash_password(password) if password else None,
            nickname=extra.pop("nickname", "Test"),
            is_verified=verified,
            **extra,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        user_id = user.id
        db.close()
        return user_id

    return _make


@pytest.fixture
def login_as(db_session):
    """Fa sì che le richieste risultino autenticate come quell'utente."""

    def _login(user_id):
        app.dependency_overrides[security.get_current_user] = (
            lambda: db_session().query(models.User).filter(models.User.id == user_id).first()
        )

    return _login


@pytest.fixture
def make_category(db_session):
    def _make(name="Altro", keywords=None):
        db = db_session()
        category = models.Category(name=name, keywords=keywords)
        db.add(category)
        db.commit()
        db.refresh(category)
        category_id = category.id
        db.close()
        return category_id

    return _make

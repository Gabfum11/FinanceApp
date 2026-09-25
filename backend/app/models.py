from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, Date, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base 


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True) 
    email = Column(String, index=True, unique=True, nullable=False)
    #nullable: chi entra solo con Google non ha una password da conservare
    hashed_password = Column(String, nullable=True)
    #id stabile dell'account Google: l'email puo' cambiare, questo no perche' e' un identificativo univoco generato da Google, serverà per login con Google. Se l'utente entra solo con email/password, resta null
    google_id = Column(String, index=True, unique=True, nullable=True) 
    nickname = Column(String, nullable=True)
    monthly_budget = Column(Float, nullable=True)
    budget_start_day = Column(Integer, nullable=True, default=1)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_verified=Column(Boolean,default=False)
    is_admin = Column(Boolean, default=False, nullable=False) #l'admin non puo' essere disattivato, serve per avere un account di emergenza per accedere al db se qualcosa va storto
    #finisce dentro ogni token: incrementandolo, tutti quelli gia' emessi
    #diventano invalidi. E' l'unico modo per disconnettere un dispositivo
    #perso prima della scadenza naturale del token
    token_version = Column(Integer, default=0, nullable=False, server_default="0")
    expenses = relationship("Expense", back_populates="owner")

    @property
    def has_password(self) -> bool:
        #gli account creati con Google non hanno una password da confermare:
        #l'app lo usa per non chiederla dove verrebbe comunque ignorata
        return self.hashed_password is not None

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    keywords = Column(String, nullable=True)
    #null solo per i gruppi: le spese puntano sempre a una sottocategoria,
    #mai al gruppo, così i totali non sono mai ambigui
    parent_id = Column(Integer, ForeignKey("categories.id"), nullable=True)

    parent = relationship("Category", remote_side=[id], back_populates="children")
    children = relationship("Category", back_populates="parent")

    expenses = relationship("Expense", back_populates="category") #comodità per scrivere category.expenses e ottenere tutte le spese di quella categoria senza quey manuale

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    description = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    date = Column(Date, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)

    owner = relationship("User", back_populates="expenses") #permette facilmente di ottenere il proprietario partendo da una spesa
    category = relationship("Category", back_populates="expenses") #se aggiungi una spesa, sqlalchemy aggiorna automaticamente la lista di spese della categoria, e viceversa

class Subscriptions(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    description = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    frequency = Column(String, nullable=False)
    next_date = Column(Date, nullable=False)
    auto_renew = Column(Boolean, default=True) 
    created_at = Column(DateTime(timezone=True), server_default=func.now()) #server_default serve per salvare con l'orario aggiornato
    is_active=Column(Boolean, default=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)

    user = relationship("User")
    category = relationship("Category")

class OtpCode(Base):
    __tablename__ = "otp_codes"
    id = Column(Integer, primary_key=True) #non serve mettere autoincrement, sqlalchemy assume che lo sia
    user_id = Column(Integer, ForeignKey("users.id"))
    code = Column(String, nullable=False)  # es. "482913"
    purpose = Column(String, nullable=False)  # "email_verification" o "password_reset"
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    attempts=Column(Integer, default=0) #numero di tentativi di inserimento del codice OTP)
    user =relationship("User")
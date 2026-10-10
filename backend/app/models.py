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
    google_id = Column(String, index=True, unique=True, nullable=True) #vuoto se l'utente si registra normalmente, non con Google
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
    #indirizzo del telefono per le notifiche push (ExponentPushToken[...]).
    #Uno solo: l'ultimo dispositivo che ha acceso i promemoria. Null = nessuna push
    push_token = Column(String, nullable=True)
    #il tutorial di primo avvio e' per account, non per telefono: chi lo ha
    #visto non lo rivede su un altro dispositivo, chi crea un account nuovo si'
    tutorial_visto = Column(Boolean, default=False, nullable=False, server_default="false")
    #codice ISO 4217 della valuta in cui l'utente registra tutto: le spese sono
    #numeri senza valuta, questa decide solo come mostrarli. Una sola per account,
    #niente conversioni: cambiarla non tocca gli importi gia' salvati
    currency = Column(String(3), default="EUR", nullable=False, server_default="EUR")
    #lingua dei testi che parte dal server (email, notifiche, esportazione):
    #quella dell'app sta sul telefono, che la manda qui quando cambia
    language = Column(String(2), default="it", nullable=False, server_default="it")
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

    #spesa pagata in un'altra valuta (es. 40 GBP a Londra): amount resta nella
    #valuta dell'utente, cosi' budget e statistiche sommano cifre omogenee, e qui
    #si conserva la cifra vera con il tasso usato. Tutti e tre vuoti = spesa
    #nella valuta dell'utente, come prima
    original_amount = Column(Float, nullable=True)
    original_currency = Column(String(3), nullable=True)
    exchange_rate = Column(Float, nullable=True)

    #l'abbonamento che ha generato la spesa, se viene da un rinnovo: rinominando
    #l'abbonamento (o cambiandone la categoria) si aggiornano anche queste spese.
    #Eliminando l'abbonamento le spese restano, scollegate (SET NULL)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id", ondelete="SET NULL"), nullable=True, index=True)
    subscription = relationship("Subscriptions")

    #testo originale della riga dell'estratto conto, solo per le spese importate:
    #la memoria degli import lo ripulisce e lo riconosce nei caricamenti successivi
    descrizione_banca = Column(String, nullable=True)
    #codice del caricamento che ha creato la spesa: "Annulla" cancella tutte
    #le spese con lo stesso codice, e una conferma ripetuta non crea doppioni
    importazione_id = Column(String(36), nullable=True, index=True)

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
    #la next_date per cui il promemoria push e' gia' partito: se il cron chiama
    #due volte lo stesso giorno, il secondo giro non manda doppioni
    reminder_sent_for = Column(Date, nullable=True)
    #valuta del prezzo (es. un servizio fatturato in USD): amount e' in questa
    #valuta e ogni rinnovo lo converte con il tasso del suo giorno. Vuota = la
    #valuta dell'utente, senza conversione
    currency = Column(String(3), nullable=True)

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

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    #solo l'hash: chi riuscisse a leggere il database non potrebbe usare i token
    token_hash = Column(String, unique=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    #valorizzato quando il token viene scambiato con uno nuovo: se torna
    #indietro un token gia' usato, qualcuno l'ha copiato
    used_at = Column(DateTime(timezone=True), nullable=True) #è il timestamp di quando il token è stato usato per ottenere un nuovo token. Se è null, il token non è mai stato usato
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    user = relationship("User")

class BudgetHistory(Base):
    #ogni budget mai impostato, con il giorno da cui vale. users.monthly_budget
    #resta la copia di quello attuale; da qui si legge quello dei mesi passati,
    #che cosi' non cambiano quando l'utente modifica il budget oggi
    __tablename__ = "budget_history"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    #vuoto = da qui in poi nessun budget: serve a tenere fermo un periodo quando
    #si corregge quello prima, se allora un budget non c'era
    amount = Column(Float, nullable=True)
    #un ciclo usa l'ultima riga con valid_from entro la sua fine: un budget
    #cambiato a meta' mese vale per tutto quel mese, non per i precedenti
    valid_from = Column(Date, nullable=False)

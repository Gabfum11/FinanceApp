from datetime import date, datetime
from datetime import date as date_type #serve dove un campo si chiama "date" e oscura il tipo
from pydantic import BaseModel,Field,EmailStr
from typing import Literal
#schema in entrata(create) -> verifica che i dati che l'utente manda sono nel formato che ci si aspetta
#schema in uscita(out) -> verifica se il sistema restituisce solo ciò che è appropriato da mostrare nella forma giusta


class ExpenseCreate(BaseModel): #rappresenta i dati che il frontend manda a te quando crea una spesa
    description: str = Field(..., min_length=1, max_length=200) #il campo è obbligatorio e deve avere lunghezza compresa tra 1 e 100
    amount: float = Field(..., gt=0, le=1000000) #il valore deve essere maggiore di 0 e minore o uguale a 1 milione
    date: date
    category_id: int | None = None


class ExpenseOut(BaseModel): # rappresenta i dati che tu mandi al frontend dopo aver salvato quella spesa
    id: int
    description: str #se arriva un json dove la descrizione non è una stringa, viene sollevato un errore 422
    amount: float
    date: date
    category_id: int | None #qui è obbligatorio che il campo sia presente
    category_name:str | None =None #se il valore non viene fornito il default è None
    category_group: str | None = None #gruppo della categoria: il client lo usa per l'icona
    created_at: datetime

    class Config:
        from_attributes=True

class ExpenseUpdate(BaseModel): #modifica parziale: i campi assenti restano invariati
    description: str | None = Field(None, min_length=1, max_length=200)
    amount: float | None = Field(None, gt=0, le=1000000)
    date: date_type | None = None #date_type: il campo "date" oscura il tipo omonimo
    category_id: int | None = None


class SubscriptionCreate(BaseModel):
    description:str
    amount: float
    frequency: Literal["monthly", "weekly", "yearly"]
    category_id: int | None = None
    start_date: date | None = None #se assente l'abbonamento parte da oggi
    

class SubscriptionUpdate(BaseModel):
    description: str | None = Field(None, min_length=1, max_length=200)
    amount: float | None = Field(None, gt=0, le=1000000)
    frequency: Literal["monthly", "weekly", "yearly"] | None = None
    category_id: int | None = None
    auto_renew: bool | None = None
    #si sposta il prossimo addebito, non la data di partenza: quella ha gia'
    #generato le spese arretrate e cambiarla renderebbe lo storico incoerente
    next_date: date_type | None = None


class SubscriptionOut(BaseModel):
    id:int
    description:str = Field(..., min_length=1, max_length=200) #il campo è obbligatorio e deve avere lunghezza compresa tra 1 e 100
    amount:float= Field(..., gt=0, le=1000000) #il valore deve essere maggiore di 0 e minore o uguale a 1 milione
    frequency: str
    is_active: bool
    next_date: date
    category_id: int | None
    category_name: str | None = None
    category_group: str | None = None #gruppo della categoria: il client lo usa per l'icona
    created_at: datetime
    auto_renew: bool=True

    class Config:
        from_attributes = True

class CategoryCreate(BaseModel):
    name: str
    keywords: str | None = None


class CategoryOut(BaseModel):
    id: int
    name: str
    keywords: str | None
    parent_id: int | None = None #null sui gruppi

    class Config:
        from_attributes = True


class CategoryGroupOut(BaseModel):
    """Un gruppo con le sue sottocategorie: il picker le mostra a due livelli."""
    id: int
    name: str
    children: list[CategoryOut] = []

    class Config:
        from_attributes = True

class UserCreate(BaseModel):
    email: EmailStr #questo tipo valida automaticamente che la stringa abbia un formato email 
    password: str=Field(...,min_length=8, max_length=72)
    nickname: str


class UserOut(BaseModel):
    id: int
    email: str
    nickname: str
    

    class Config:
        from_attributes = True
        #senza from_attributes
        #ser_obj = db.query(models.User).first()  # oggetto SQLAlchemy, non un dizionario
        #return user_obj  # FastAPI prova a convertirlo in UserOut → errore, perché non è un dict


class Token(BaseModel):
    access_token: str
    token_type: str

class UserLogin(BaseModel):
    email:str
    password:str
    remember_me:bool=False

class VerifyEmail(BaseModel):
    email:str
    code:str
    purpose: Literal["email_verification", "password_reset"] = "email_verification"

class ResendOtp(BaseModel):
    email:str
    purpose: Literal["email_verification", "password_reset"]

class ResetPassword(BaseModel):
    new_password:str=Field(...,min_length=8,max_length=72)

class CategoryStat(BaseModel):
    category_name:str
    total: float

class StatsOut(BaseModel):
    cycle_start: date
    cycle_end: date
    categories: list[CategoryStat]

class DayStat(BaseModel):
    date: date
    total: float

class WeeklyStatsOut(BaseModel):
    week_start: date
    week_end: date
    days: list[DayStat]

class BuddgetDate(BaseModel):
    monthly_budget: float
    budget_start_day: int = Field(..., ge=1, le=31)  # Valore compreso tra 1 e 31

class ChangePassword(BaseModel):
    current_password:str
    new_password:str = Field(..., min_length=8, max_length=72)

class DeleteAccount(BaseModel): #la password conferma un'operazione irreversibile
    password: str

class GoogleLogin(BaseModel):
    id_token: str #token rilasciato da Google all'app, che il server verifica
    remember_me: bool = False
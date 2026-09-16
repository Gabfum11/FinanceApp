from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.business_logic import security
from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/categories", tags=["categories"])


@router.post("/", response_model=schemas.CategoryOut) #quando avviene una richiesta HTTP (dall'esterno o dai test su docs)
def create_category(category: schemas.CategoryCreate, db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_admin)):
    new_category = models.Category(name=category.name, keywords=category.keywords)
    db.add(new_category)
    db.commit()
    db.refresh(new_category)
    return new_category


@router.get("/", response_model=List[schemas.CategoryOut])
def list_categories(db: Session = Depends(get_db), current_user: models.User=Depends(security.get_current_user)):
    return db.query(models.Category).all()

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ....database import get_db
from ....crud import barber as crud
from ....schemas.barber import BarberCreate, BarberUpdate, BarberOut
from ....security import get_current_user, require_admin

router = APIRouter()


@router.get("/", response_model=List[BarberOut])
def list_barbers(active_only: bool = False, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return crud.get_barbers(db, active_only=active_only)


@router.post("/", response_model=BarberOut)
def create_barber(data: BarberCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    return crud.create_barber(db, data)


@router.get("/{barber_id}", response_model=BarberOut)
def get_barber(barber_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    obj = crud.get_barber(db, barber_id)
    if not obj:
        raise HTTPException(404, "Barbero no encontrado")
    return obj


@router.put("/{barber_id}", response_model=BarberOut)
def update_barber(barber_id: int, data: BarberUpdate, db: Session = Depends(get_db), _=Depends(require_admin)):
    obj = crud.update_barber(db, barber_id, data)
    if not obj:
        raise HTTPException(404, "Barbero no encontrado")
    return obj

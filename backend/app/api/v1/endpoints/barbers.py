from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ....database import get_db
from ....crud import barber as crud
from ....schemas.barber import BarberCreate, BarberUpdate, BarberOut
from ....security import get_current_user, require_admin, get_company_id

router = APIRouter()


@router.get("/", response_model=List[BarberOut])
def list_barbers(
    active_only: bool = False,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
    company_id: int = Depends(get_company_id),
):
    return crud.get_barbers(db, company_id, active_only=active_only)


@router.post("/", response_model=BarberOut)
def create_barber(
    data: BarberCreate,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
    company_id: int = Depends(get_company_id),
):
    return crud.create_barber(db, company_id, data)


@router.get("/{barber_id}", response_model=BarberOut)
def get_barber(
    barber_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
    company_id: int = Depends(get_company_id),
):
    obj = crud.get_barber(db, company_id, barber_id)
    if not obj:
        raise HTTPException(404, "Barbero no encontrado")
    return obj


@router.put("/{barber_id}", response_model=BarberOut)
def update_barber(
    barber_id: int,
    data: BarberUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
    company_id: int = Depends(get_company_id),
):
    obj = crud.update_barber(db, company_id, barber_id, data)
    if not obj:
        raise HTTPException(404, "Barbero no encontrado")
    return obj

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from ....database import get_db
from ....schemas.barber import (
    BarberCreate, BarberUpdate, BarberOut, BarberDashboard,
    AdvanceCreate, AdvanceOut, BankTransferCreate, BankTransferOut
)
from ....crud.barber import (
    get_barbers, get_barber, create_barber, update_barber, get_barber_dashboard,
    create_advance, get_advances, create_bank_transfer, get_bank_transfers
)
from ....security import get_current_user

router = APIRouter()


@router.get("/", response_model=List[BarberOut])
def list_barbers(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return get_barbers(db)


@router.post("/", response_model=BarberOut)
def new_barber(barber: BarberCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return create_barber(db, barber)


@router.get("/{barber_id}", response_model=BarberOut)
def get_one(barber_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    b = get_barber(db, barber_id)
    if not b:
        raise HTTPException(404, "Barbero no encontrado")
    return b


@router.put("/{barber_id}", response_model=BarberOut)
def edit_barber(barber_id: int, barber: BarberUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    b = update_barber(db, barber_id, barber)
    if not b:
        raise HTTPException(404, "Barbero no encontrado")
    return b


@router.get("/{barber_id}/dashboard", response_model=BarberDashboard)
def dashboard(
    barber_id: int,
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(get_current_user)
):
    result = get_barber_dashboard(db, barber_id, date_from, date_to)
    if not result:
        raise HTTPException(404, "Barbero no encontrado")
    return result


@router.post("/advances/", response_model=AdvanceOut)
def new_advance(advance: AdvanceCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return create_advance(db, advance)


@router.get("/advances/list", response_model=List[AdvanceOut])
def list_advances(barber_id: Optional[int] = None, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return get_advances(db, barber_id)


@router.post("/transfers/", response_model=BankTransferOut)
def new_transfer(transfer: BankTransferCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return create_bank_transfer(db, transfer)


@router.get("/transfers/list", response_model=List[BankTransferOut])
def list_transfers(barber_id: Optional[int] = None, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return get_bank_transfers(db, barber_id)

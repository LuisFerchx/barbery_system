from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from ....database import get_db
from ....schemas.debt import DebtCreate, DebtUpdate, DebtOut, DebtPaymentCreate
from ....crud.debt import get_debts, get_debt, create_debt, update_debt, register_payment
from ....security import get_current_user

router = APIRouter()


@router.get("/", response_model=List[DebtOut])
def list_debts(
    status: Optional[str] = None,
    client_name: Optional[str] = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    return get_debts(db, status, client_name)


@router.post("/", response_model=DebtOut)
def new_debt(debt: DebtCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return create_debt(db, debt)


@router.get("/{debt_id}", response_model=DebtOut)
def get_one(debt_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    d = get_debt(db, debt_id)
    if not d:
        raise HTTPException(404, "Deuda no encontrada")
    return d


@router.put("/{debt_id}", response_model=DebtOut)
def edit_debt(debt_id: int, debt: DebtUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    d = update_debt(db, debt_id, debt)
    if not d:
        raise HTTPException(404, "Deuda no encontrada")
    return d


@router.post("/{debt_id}/payment", response_model=DebtOut)
def pay_debt(debt_id: int, payment: DebtPaymentCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    d = register_payment(db, debt_id, payment)
    if not d:
        raise HTTPException(404, "Deuda no encontrada")
    return d

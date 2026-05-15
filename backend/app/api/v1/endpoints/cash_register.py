from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from ....database import get_db
from ....crud import cash_register as crud
from ....schemas.cash_register import CashSummary, CashRegisterCloseIn, CashRegisterClosingOut
from ....security import get_current_user, require_admin, get_company_id

router = APIRouter()


@router.get("/summary/", response_model=CashSummary)
def cash_summary(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
    company_id: int = Depends(get_company_id),
):
    return crud.get_cash_summary(db, company_id)


@router.post("/close/", response_model=CashRegisterClosingOut)
def close_register(
    data: CashRegisterCloseIn,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
    company_id: int = Depends(get_company_id),
):
    return crud.create_closing(db, company_id, current_user.id, data)


@router.get("/closings/", response_model=List[CashRegisterClosingOut])
def list_closings(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
    company_id: int = Depends(get_company_id),
):
    return crud.get_closings(db, company_id)

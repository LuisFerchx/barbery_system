from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from ....database import get_db
from ....crud import expense as crud
from ....schemas.expense import ExpenseCreate, ExpenseUpdate, ExpenseOut
from ....security import get_current_user, get_company_id

router = APIRouter()


@router.get("/", response_model=List[ExpenseOut])
def list_expenses(
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
    company_id: int = Depends(get_company_id),
):
    return crud.get_expenses(db, company_id, date_from=date_from, date_to=date_to, category=category)


@router.post("/", response_model=ExpenseOut)
def create_expense(
    data: ExpenseCreate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
    company_id: int = Depends(get_company_id),
):
    return crud.create_expense(db, company_id, data)


@router.put("/{expense_id}", response_model=ExpenseOut)
def update_expense(
    expense_id: int,
    data: ExpenseUpdate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
    company_id: int = Depends(get_company_id),
):
    obj = crud.update_expense(db, company_id, expense_id, data)
    if not obj:
        raise HTTPException(404, "Gasto no encontrado")
    return obj


@router.delete("/{expense_id}")
def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
    company_id: int = Depends(get_company_id),
):
    obj = crud.delete_expense(db, company_id, expense_id)
    if not obj:
        raise HTTPException(404, "Gasto no encontrado")
    return {"ok": True}

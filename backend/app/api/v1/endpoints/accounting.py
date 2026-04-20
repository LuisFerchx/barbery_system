from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from ....database import get_db
from ....schemas.expense import ExpenseCreate, ExpenseUpdate, ExpenseOut, AccountingDashboard
from ....crud.expense import get_expenses, create_expense, update_expense, delete_expense, get_accounting_dashboard
from ....security import get_current_user

router = APIRouter()


@router.get("/dashboard", response_model=AccountingDashboard)
def dashboard(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    return get_accounting_dashboard(db, date_from, date_to)


@router.get("/expenses", response_model=List[ExpenseOut])
def list_expenses(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    return get_expenses(db, date_from, date_to, category)


@router.post("/expenses", response_model=ExpenseOut)
def new_expense(expense: ExpenseCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return create_expense(db, expense)


@router.put("/expenses/{expense_id}", response_model=ExpenseOut)
def edit_expense(expense_id: int, expense: ExpenseUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    e = update_expense(db, expense_id, expense)
    if not e:
        raise HTTPException(404, "Gasto no encontrado")
    return e


@router.delete("/expenses/{expense_id}")
def remove_expense(expense_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    delete_expense(db, expense_id)
    return {"ok": True}

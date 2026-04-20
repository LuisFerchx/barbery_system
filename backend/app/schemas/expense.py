from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime


class ExpenseCreate(BaseModel):
    date: date
    category: str
    description: Optional[str] = None
    amount: float
    payment_method: str = "efectivo"


class ExpenseUpdate(BaseModel):
    date: Optional[date] = None
    category: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    payment_method: Optional[str] = None


class ExpenseOut(ExpenseCreate):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class AccountingDashboard(BaseModel):
    service_income: float
    product_income: float
    transfer_income: float
    cash_income: float
    total_income: float
    total_expenses: float
    net_profit: float
    period_label: str

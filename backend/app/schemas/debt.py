from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime


class DebtCreate(BaseModel):
    client_name: str
    client_lastname: Optional[str] = None
    client_phone: Optional[str] = None
    concept: str
    original_amount: float
    date: date
    due_date: Optional[date] = None
    notes: Optional[str] = None


class DebtUpdate(BaseModel):
    concept: Optional[str] = None
    due_date: Optional[date] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class DebtOut(DebtCreate):
    id: int
    paid_amount: float
    pending_amount: float
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class DebtPaymentCreate(BaseModel):
    amount: float
    date: date
    payment_method: str = "efectivo"
    note: Optional[str] = None


class DebtPaymentOut(DebtPaymentCreate):
    id: int
    debt_id: int
    created_at: datetime

    model_config = {"from_attributes": True}

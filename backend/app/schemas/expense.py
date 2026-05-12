from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


class ExpenseCreate(BaseModel):
    date: datetime
    category: str  # rent, utilities, supplies, marketing, other
    description: Optional[str] = None
    amount: Decimal
    payment_method: str = "cash"


class ExpenseUpdate(BaseModel):
    date: Optional[datetime] = None
    category: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[Decimal] = None
    payment_method: Optional[str] = None


class ExpenseOut(BaseModel):
    id: int
    date: datetime
    category: str
    description: Optional[str] = None
    amount: Decimal
    payment_method: str
    created_at: datetime

    model_config = {"from_attributes": True}

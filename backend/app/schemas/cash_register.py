from pydantic import BaseModel, ConfigDict
from typing import Optional
from decimal import Decimal
from datetime import datetime


class CashSummary(BaseModel):
    period_from: datetime
    period_to: datetime
    sales_cash: Decimal
    product_sales_cash: Decimal
    expenses_cash: Decimal
    expected_cash: Decimal


class CashRegisterCloseIn(BaseModel):
    actual_cash: Decimal
    notes: Optional[str] = None


class CashRegisterClosingOut(BaseModel):
    id: int
    closed_at: datetime
    period_from: datetime
    period_to: datetime
    sales_cash: Decimal
    product_sales_cash: Decimal
    expenses_cash: Decimal
    expected_cash: Decimal
    actual_cash: Decimal
    discrepancy: Decimal
    notes: Optional[str]
    closed_by_user_id: int

    model_config = ConfigDict(from_attributes=True)

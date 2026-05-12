from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


class SaleCreate(BaseModel):
    date: datetime
    client_id: Optional[int] = None
    barber_id: int
    service_id: int
    gross_total: Decimal
    payment_method: str  # cash, card_debit, card_credit, transfer
    is_returning_client: bool = False
    courtesy_drink_given: bool = False
    courtesy_drink_item_id: Optional[int] = None
    cross_sell: bool = False
    notes: Optional[str] = None


class SaleOut(BaseModel):
    id: int
    number: str
    date: datetime
    client_id: Optional[int] = None
    client_name: Optional[str] = None
    barber_id: int
    barber_name: Optional[str] = None
    service_id: int
    service_name: Optional[str] = None
    gross_total: Decimal
    payment_method: str
    is_returning_client: bool
    barber_commission_amount: Decimal
    real_income: Decimal
    split_profit: Decimal
    split_owner_salary: Decimal
    split_taxes: Decimal
    split_operating: Decimal
    courtesy_drink_given: bool
    courtesy_drink_item_id: Optional[int] = None
    courtesy_drink_item_name: Optional[str] = None
    cross_sell: bool
    notes: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class SaleListOut(BaseModel):
    items: List[SaleOut]
    total: int
    page: int
    page_size: int
    pages: int

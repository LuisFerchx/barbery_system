from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


class ProductSaleCreate(BaseModel):
    date: datetime
    barber_id: int
    item_id: int
    client_id: Optional[int] = None
    quantity: Decimal
    unit_price: Decimal
    payment_method: str
    notes: Optional[str] = None


class ProductSaleOut(BaseModel):
    id: int
    date: datetime
    barber_id: int
    barber_name: Optional[str] = None
    item_id: int
    item_name: Optional[str] = None
    client_id: Optional[int] = None
    client_name: Optional[str] = None
    quantity: Decimal
    unit_price: Decimal
    subtotal: Decimal
    barber_commission_amount: Decimal
    payment_method: str
    notes: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ProductSaleListOut(BaseModel):
    items: List[ProductSaleOut]
    total: int
    page: int
    page_size: int
    pages: int

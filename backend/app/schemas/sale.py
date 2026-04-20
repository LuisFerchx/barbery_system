from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime


class SaleBase(BaseModel):
    date: date
    client_name: str
    client_lastname: Optional[str] = None
    contact: str = "REGISTRADO"
    barber_id: int
    service_id: Optional[int] = None
    service_value: float = 0.0
    product_id: Optional[int] = None
    product_value: float = 0.0
    drink: str = "NADA"
    total: float = 0.0
    tip: float = 0.0
    bank_transfer: float = 0.0
    barber_commission: float = 0.0
    notes: Optional[str] = None


class SaleCreate(SaleBase):
    pass


class SaleUpdate(BaseModel):
    date: Optional[date] = None
    client_name: Optional[str] = None
    client_lastname: Optional[str] = None
    barber_id: Optional[int] = None
    service_id: Optional[int] = None
    service_value: Optional[float] = None
    product_id: Optional[int] = None
    product_value: Optional[float] = None
    drink: Optional[str] = None
    total: Optional[float] = None
    tip: Optional[float] = None
    bank_transfer: Optional[float] = None
    barber_commission: Optional[float] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class SaleOut(SaleBase):
    id: int
    status: str
    created_at: datetime
    barber_name: Optional[str] = None
    service_name: Optional[str] = None
    product_name: Optional[str] = None

    model_config = {"from_attributes": True}


class SaleFilters(BaseModel):
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    barber_id: Optional[int] = None
    client_name: Optional[str] = None
    min_total: Optional[float] = None
    max_total: Optional[float] = None


class PaginatedSales(BaseModel):
    items: List[SaleOut]
    total: int
    page: int
    page_size: int
    pages: int

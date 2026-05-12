from pydantic import BaseModel
from typing import Optional
from decimal import Decimal


class ServiceCreate(BaseModel):
    name: str
    category: str  # haircut, beard, combo, other
    price: Decimal


class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    price: Optional[Decimal] = None
    is_active: Optional[bool] = None


class ServiceOut(BaseModel):
    id: int
    name: str
    category: str
    price: Decimal
    is_active: bool

    model_config = {"from_attributes": True}


class ProductCreate(BaseModel):
    name: str
    brand: Optional[str] = None
    cost_price: Decimal
    sale_price: Decimal


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    brand: Optional[str] = None
    cost_price: Optional[Decimal] = None
    sale_price: Optional[Decimal] = None
    is_active: Optional[bool] = None


class ProductOut(BaseModel):
    id: int
    name: str
    brand: Optional[str] = None
    cost_price: Decimal
    sale_price: Decimal
    is_active: bool

    model_config = {"from_attributes": True}

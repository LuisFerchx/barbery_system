from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ServiceBase(BaseModel):
    name: str
    price: float
    commission: float = 0.0
    description: Optional[str] = None


class ServiceCreate(ServiceBase):
    pass


class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    commission: Optional[float] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class ServiceOut(ServiceBase):
    id: int
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ProductBase(BaseModel):
    name: str
    price: float
    commission: float = 0.0
    description: Optional[str] = None


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    commission: Optional[float] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class ProductOut(ProductBase):
    id: int
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}

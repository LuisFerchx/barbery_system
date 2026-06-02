from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from decimal import Decimal
from .service_type import ServiceTypeOut


class BarberCreate(BaseModel):
    name: str
    lastname: str
    phone: Optional[str] = None
    commission_rate: Decimal = Decimal("0.40")


class BarberUpdate(BaseModel):
    name: Optional[str] = None
    lastname: Optional[str] = None
    phone: Optional[str] = None
    commission_rate: Optional[Decimal] = None
    is_active: Optional[bool] = None


class BarberServiceTypesUpdate(BaseModel):
    service_type_ids: list[int]


class BarberOut(BaseModel):
    id: int
    name: str
    lastname: str
    phone: Optional[str] = None
    photo_url: Optional[str] = None
    commission_rate: Decimal
    is_active: bool
    created_at: datetime
    service_types: list[ServiceTypeOut] = []

    model_config = {"from_attributes": True}

from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from decimal import Decimal


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


class BarberOut(BaseModel):
    id: int
    name: str
    lastname: str
    phone: Optional[str] = None
    commission_rate: Decimal
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}

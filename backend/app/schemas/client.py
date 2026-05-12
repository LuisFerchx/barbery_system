from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ClientCreate(BaseModel):
    name: str
    lastname: str
    phone: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None
    identification_number: Optional[str] = None


class ClientUpdate(BaseModel):
    name: Optional[str] = None
    lastname: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None
    identification_number: Optional[str] = None
    is_active: Optional[bool] = None


class ClientOut(BaseModel):
    id: int
    name: str
    lastname: str
    phone: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None
    identification_number: Optional[str] = None
    is_active: bool
    created_at: datetime
    total_sales: Optional[int] = 0

    model_config = {"from_attributes": True}

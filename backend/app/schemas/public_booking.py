from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime


class ShopPublicOut(BaseModel):
    name: str
    slug: str
    phone: Optional[str] = None
    address: Optional[str] = None
    open_hour: Optional[str] = None
    close_hour: Optional[str] = None
    operating_days: Optional[str] = None
    is_active: bool

    model_config = {"from_attributes": True}


class BarberPublicOut(BaseModel):
    id: int
    name: str
    lastname: str

    model_config = {"from_attributes": True}


class ServicePublicOut(BaseModel):
    id: int
    name: str
    category: str
    price: float
    duration: Optional[int] = None

    model_config = {"from_attributes": True}


class SlotOut(BaseModel):
    time: str       # "HH:MM"
    datetime: str   # ISO 8601 UTC


class BookingCreate(BaseModel):
    barber_id: int
    service_id: int
    scheduled_at: datetime
    client_phone: str
    client_name: str
    client_lastname: str
    client_email: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("client_phone")
    @classmethod
    def phone_min_length(cls, v: str) -> str:
        if len(v.strip()) < 7:
            raise ValueError("Teléfono debe tener al menos 7 caracteres")
        return v.strip()

    @field_validator("client_name", "client_lastname")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Campo requerido")
        return v.strip()


class BookingOut(BaseModel):
    id: int
    code: Optional[str] = None
    barber_name: str
    service_name: str
    scheduled_at: datetime
    end_at: datetime
    duration_minutes: int
    status: str
    client_name: Optional[str] = None

    model_config = {"from_attributes": True}


class AppointmentPublicOut(BaseModel):
    id: int
    code: Optional[str] = None
    shop_name: str
    shop_slug: str
    barber_name: str
    service_name: str
    scheduled_at: datetime
    end_at: datetime
    duration_minutes: int
    status: str
    client_name: Optional[str] = None
    notes: Optional[str] = None

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class AppointmentCreate(BaseModel):
    barber_id: int
    service_id: int
    scheduled_at: datetime
    client_id: Optional[int] = None
    notes: Optional[str] = None


class AppointmentReschedule(BaseModel):
    scheduled_at: datetime
    barber_id: Optional[int] = None


class AppointmentUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None


class AppointmentOut(BaseModel):
    id: int
    company_id: int
    client_id: Optional[int] = None
    client_name: Optional[str] = None
    barber_id: int
    barber_name: str
    service_id: int
    service_name: str
    duration_minutes: int
    scheduled_at: datetime
    end_at: datetime
    status: str
    notes: Optional[str] = None
    code: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class AppointmentListOut(BaseModel):
    items: List[AppointmentOut]
    total: int
    page: int
    page_size: int
    pages: int

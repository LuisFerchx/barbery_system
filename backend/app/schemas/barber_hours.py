from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime


class BarberHoursCreate(BaseModel):
    name: str
    start_time: str = Field(..., description="HH:MM format")
    end_time: str = Field(..., description="HH:MM format")
    start_date: date
    end_date: date
    is_recurring: bool = True
    day_of_week: Optional[str] = None  # comma separated weekdays, e.g. "0,1,2"
    exceptions: Optional[str] = None  # comma separated YYYY-MM-DD dates


class BarberHoursUpdate(BaseModel):
    name: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_recurring: Optional[bool] = None
    day_of_week: Optional[str] = None
    exceptions: Optional[str] = None


class BarberHoursOut(BaseModel):
    id: int
    company_id: int
    barber_id: int
    name: str
    start_time: str
    end_time: str
    start_date: date
    end_date: date
    is_recurring: bool
    day_of_week: Optional[str] = None
    exceptions: Optional[str] = None

    model_config = {"from_attributes": True}

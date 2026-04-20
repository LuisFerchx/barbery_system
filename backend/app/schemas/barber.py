from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class BarberBase(BaseModel):
    name: str
    lastname: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    commission_rate: float = 0.0


class BarberCreate(BarberBase):
    pass


class BarberUpdate(BaseModel):
    name: Optional[str] = None
    lastname: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    commission_rate: Optional[float] = None
    is_active: Optional[bool] = None


class BarberOut(BarberBase):
    id: int
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class AdvanceCreate(BaseModel):
    barber_id: int
    amount: float
    note: Optional[str] = None


class AdvanceOut(BaseModel):
    id: int
    barber_id: int
    amount: float
    date: datetime
    note: Optional[str] = None

    model_config = {"from_attributes": True}


class BankTransferCreate(BaseModel):
    barber_id: Optional[int] = None
    recipient_name: str
    amount: float
    bank: str
    reference: Optional[str] = None
    note: Optional[str] = None


class BankTransferOut(BankTransferCreate):
    id: int
    date: datetime

    model_config = {"from_attributes": True}


class BarberDashboard(BaseModel):
    barber: BarberOut
    total_clients: int
    total_sales: float
    total_commissions: float
    total_advances: float
    net_balance: float
    total_bank_transfers: float

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CompanyBase(BaseModel):
    name: str
    slug: str
    phone: Optional[str] = None
    address: Optional[str] = None
    commission_by_service: bool = False


class CompanyCreate(CompanyBase):
    pass


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    is_active: Optional[bool] = None
    commission_by_service: Optional[bool] = None


class CompanyOut(CompanyBase):
    id: int
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class AdminUserCreate(BaseModel):
    username: str
    password: str
    full_name: Optional[str] = None
    email: Optional[str] = None


class CompanySetupCreate(CompanyBase):
    admin: Optional[AdminUserCreate] = None

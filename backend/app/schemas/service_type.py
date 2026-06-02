from pydantic import BaseModel
from typing import Optional


class ServiceTypeCreate(BaseModel):
    name: str
    description: Optional[str] = None


class ServiceTypeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class ServiceTypeOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    is_active: bool

    model_config = {"from_attributes": True}

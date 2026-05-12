from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ManualEntryCreate(BaseModel):
    section: str  # courtesy_protocol, cross_sell_script, checkout_procedure, other
    title: str
    content: Optional[str] = None
    order_index: int = 0


class ManualEntryUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    order_index: Optional[int] = None
    updated_by: Optional[str] = None


class ManualEntryOut(BaseModel):
    id: int
    section: str
    title: str
    content: Optional[str] = None
    order_index: int
    updated_at: datetime
    updated_by: Optional[str] = None

    model_config = {"from_attributes": True}

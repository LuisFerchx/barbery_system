from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class InventoryItemBase(BaseModel):
    name: str
    category: Optional[str] = None
    unit: str = "unidad"
    stock_initial: int = 0
    stock_current: int = 0
    low_stock_alert: int = 5
    cost_price: float = 0.0
    sale_price: float = 0.0


class InventoryItemCreate(InventoryItemBase):
    pass


class InventoryItemUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    stock_current: Optional[int] = None
    low_stock_alert: Optional[int] = None
    cost_price: Optional[float] = None
    sale_price: Optional[float] = None
    is_active: Optional[int] = None


class InventoryItemOut(InventoryItemBase):
    id: int
    stock_opened: int
    stock_sold: int
    is_active: int
    created_at: datetime

    model_config = {"from_attributes": True}


class MovementCreate(BaseModel):
    item_id: int
    movement_type: str  # entrada, salida, ajuste
    quantity: int
    reason: Optional[str] = None


class MovementOut(MovementCreate):
    id: int
    date: datetime

    model_config = {"from_attributes": True}

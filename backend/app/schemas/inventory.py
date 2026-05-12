from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


class InventoryItemCreate(BaseModel):
    name: str
    category: str  # merchandise, courtesy
    unit: str = "unidad"
    stock_current: Decimal = Decimal("0")
    stock_minimum: Decimal = Decimal("5")
    cost_per_unit: Decimal = Decimal("0")


class InventoryItemUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    stock_current: Optional[Decimal] = None
    stock_minimum: Optional[Decimal] = None
    cost_per_unit: Optional[Decimal] = None
    is_active: Optional[bool] = None


class InventoryItemOut(BaseModel):
    id: int
    name: str
    category: str
    unit: str
    stock_current: Decimal
    stock_minimum: Decimal
    cost_per_unit: Decimal
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class MovementCreate(BaseModel):
    item_id: int
    movement_type: str  # in, out, adjustment
    quantity: Decimal
    reason: Optional[str] = None
    date: Optional[datetime] = None


class MovementOut(BaseModel):
    id: int
    item_id: int
    movement_type: str
    quantity: Decimal
    reason: Optional[str] = None
    date: datetime
    product_sale_id: Optional[int] = None

    model_config = {"from_attributes": True}

from pydantic import BaseModel
from typing import List, Optional
from decimal import Decimal


class InventoryAlert(BaseModel):
    item_id: int
    name: str
    category: str
    stock_current: Decimal
    stock_minimum: Decimal

    model_config = {"from_attributes": True}


class TopBarber(BaseModel):
    barber_id: int
    name: str
    lastname: str
    total_real_income: Decimal
    total_sales: int


class SplitBreakdown(BaseModel):
    profit: Decimal
    owner_salary: Decimal
    taxes: Decimal
    operating: Decimal


class DashboardSummary(BaseModel):
    month: str
    gross_income: Decimal
    service_gross_income: Decimal
    product_gross_income: Decimal
    barber_commissions_total: Decimal
    real_income_total: Decimal
    total_expenses: Decimal
    operating_profit: Decimal
    taxes_reserved: Decimal
    net_profit: Decimal
    split_breakdown: SplitBreakdown
    cash_register_adjustments: Decimal
    cash_closings_count: int
    inventory_alerts: List[InventoryAlert]
    top_barbers: List[TopBarber]

from pydantic import BaseModel
from typing import List
from decimal import Decimal


class ClientMetrics(BaseModel):
    month: str
    new_clients: int
    returning_clients: int
    total_clients: int
    retention_rate: Decimal


class BarberCrossSell(BaseModel):
    barber_id: int
    name: str
    lastname: str
    total_services: int
    product_sales_count: int
    cross_sell_rate: Decimal


class CrossSellMetrics(BaseModel):
    month: str
    total_services: int
    cross_sell_count: int
    overall_rate: Decimal
    by_barber: List[BarberCrossSell]


class CourtesyDrinkRank(BaseModel):
    item_id: int
    name: str
    count: int


class CourtesyDrinksMetrics(BaseModel):
    month: str
    top_drinks: List[CourtesyDrinkRank]

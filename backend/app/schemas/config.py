from pydantic import BaseModel, field_validator
from typing import List
from decimal import Decimal
from datetime import datetime


class SplitConfigOut(BaseModel):
    id: int
    name: str
    percentage: Decimal
    updated_at: datetime

    model_config = {"from_attributes": True}


class SplitConfigUpdate(BaseModel):
    profit: Decimal
    owner_salary: Decimal
    taxes: Decimal
    operating: Decimal

    @field_validator("operating")
    @classmethod
    def validate_sum(cls, v, info):
        values = info.data
        total = values.get("profit", 0) + values.get("owner_salary", 0) + values.get("taxes", 0) + v
        if abs(total - Decimal("1.0")) > Decimal("0.001"):
            raise ValueError(f"Los porcentajes deben sumar 1.0 (100%). Suma actual: {total}")
        return v


class PaymentMethodConfigOut(BaseModel):
    id: int
    method: str
    commission_rate: Decimal
    updated_at: datetime

    model_config = {"from_attributes": True}


class PaymentMethodConfigUpdate(BaseModel):
    commission_rate: Decimal

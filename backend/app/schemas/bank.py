from pydantic import BaseModel
from typing import Optional


class BankOut(BaseModel):
    id: int
    name: str
    account: Optional[str] = None

    model_config = {"from_attributes": True}

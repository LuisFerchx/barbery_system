from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ....database import get_db
from ....crud import config as crud
from ....schemas.config import SplitConfigOut, SplitConfigUpdate, PaymentMethodConfigOut, PaymentMethodConfigUpdate
from ....security import require_admin, get_current_user, get_company_id

router = APIRouter()


@router.get("/split", response_model=List[SplitConfigOut])
def get_split(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
    company_id: int = Depends(get_company_id),
):
    return crud.get_split_config(db, company_id)


@router.put("/split", response_model=List[SplitConfigOut])
def update_split(
    data: SplitConfigUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
    company_id: int = Depends(get_company_id),
):
    return crud.update_split_config(db, company_id, data)


@router.get("/payment-methods", response_model=List[PaymentMethodConfigOut])
def get_payment_methods(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
    company_id: int = Depends(get_company_id),
):
    return crud.get_payment_method_config(db, company_id)


@router.put("/payment-methods/{method}", response_model=PaymentMethodConfigOut)
def update_payment_method(
    method: str,
    data: PaymentMethodConfigUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
    company_id: int = Depends(get_company_id),
):
    obj = crud.update_payment_method(db, company_id, method, data)
    if not obj:
        raise HTTPException(404, f"Método de pago '{method}' no encontrado")
    return obj

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime
from ....database import get_db
from ....crud import analytics as crud
from ....schemas.analytics import ClientMetrics, CrossSellMetrics, CourtesyDrinksMetrics
from ....security import get_current_user

router = APIRouter()


def _current_month() -> str:
    now = datetime.now()
    return f"{now.year}-{now.month:02d}"


@router.get("/clients", response_model=ClientMetrics)
def client_metrics(
    month: str = Query(default=None, description="YYYY-MM"),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    return crud.get_client_metrics(db, month or _current_month())


@router.get("/cross-sell", response_model=CrossSellMetrics)
def cross_sell_metrics(
    month: str = Query(default=None, description="YYYY-MM"),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    return crud.get_cross_sell_metrics(db, month or _current_month())


@router.get("/courtesy-drinks", response_model=CourtesyDrinksMetrics)
def courtesy_drinks_metrics(
    month: str = Query(default=None, description="YYYY-MM"),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    return crud.get_top_courtesy_drinks(db, month or _current_month())

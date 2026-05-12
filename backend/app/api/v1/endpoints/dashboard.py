from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime
from ....database import get_db
from ....crud import dashboard as crud
from ....schemas.dashboard import DashboardSummary
from ....security import get_current_user

router = APIRouter()


def _current_month() -> str:
    now = datetime.now()
    return f"{now.year}-{now.month:02d}"


@router.get("/summary", response_model=DashboardSummary)
def summary(
    month: str = Query(default=None, description="YYYY-MM"),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    return crud.get_dashboard_summary(db, month or _current_month())

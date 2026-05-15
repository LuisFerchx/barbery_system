from sqlalchemy.orm import Session
from decimal import Decimal
from ..models.config import IncomeSplitConfig, PaymentMethodConfig
from ..schemas.config import SplitConfigUpdate, PaymentMethodConfigUpdate

_DEFAULT_SPLIT = [
    ("profit",       Decimal("0.40")),
    ("owner_salary", Decimal("0.30")),
    ("taxes",        Decimal("0.20")),
    ("operating",    Decimal("0.10")),
]

_DEFAULT_PAYMENT_METHODS = [
    ("cash",        Decimal("0.00")),
    ("card_debit",  Decimal("0.02")),
    ("card_credit", Decimal("0.03")),
    ("transfer",    Decimal("0.01")),
]


def seed_company_defaults(db: Session, company_id: int, commit: bool = True) -> None:
    for name, pct in _DEFAULT_SPLIT:
        db.add(IncomeSplitConfig(name=name, percentage=pct, company_id=company_id))
    for method, rate in _DEFAULT_PAYMENT_METHODS:
        db.add(PaymentMethodConfig(method=method, commission_rate=rate, company_id=company_id))
    if commit:
        db.commit()


def get_split_config(db: Session, company_id: int):
    return db.query(IncomeSplitConfig).filter(
        IncomeSplitConfig.company_id == company_id
    ).all()


def update_split_config(db: Session, company_id: int, data: SplitConfigUpdate):
    mapping = {
        "profit": data.profit,
        "owner_salary": data.owner_salary,
        "taxes": data.taxes,
        "operating": data.operating,
    }
    for name, pct in mapping.items():
        row = db.query(IncomeSplitConfig).filter(
            IncomeSplitConfig.company_id == company_id,
            IncomeSplitConfig.name == name,
        ).first()
        if row:
            row.percentage = pct
        else:
            db.add(IncomeSplitConfig(name=name, percentage=pct, company_id=company_id))
    db.commit()
    return get_split_config(db, company_id)


def get_payment_method_config(db: Session, company_id: int):
    return db.query(PaymentMethodConfig).filter(
        PaymentMethodConfig.company_id == company_id
    ).all()


def update_payment_method(db: Session, company_id: int, method: str, data: PaymentMethodConfigUpdate):
    row = db.query(PaymentMethodConfig).filter(
        PaymentMethodConfig.company_id == company_id,
        PaymentMethodConfig.method == method,
    ).first()
    if row:
        row.commission_rate = data.commission_rate
        db.commit()
        db.refresh(row)
        return row
    return None

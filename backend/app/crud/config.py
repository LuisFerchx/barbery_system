from sqlalchemy.orm import Session
from decimal import Decimal
from ..models.config import IncomeSplitConfig, PaymentMethodConfig
from ..schemas.config import SplitConfigUpdate, PaymentMethodConfigUpdate


def get_split_config(db: Session):
    return db.query(IncomeSplitConfig).all()


def update_split_config(db: Session, data: SplitConfigUpdate):
    mapping = {
        "profit": data.profit,
        "owner_salary": data.owner_salary,
        "taxes": data.taxes,
        "operating": data.operating,
    }
    for name, pct in mapping.items():
        row = db.query(IncomeSplitConfig).filter(IncomeSplitConfig.name == name).first()
        if row:
            row.percentage = pct
        else:
            db.add(IncomeSplitConfig(name=name, percentage=pct))
    db.commit()
    return get_split_config(db)


def get_payment_method_config(db: Session):
    return db.query(PaymentMethodConfig).all()


def update_payment_method(db: Session, method: str, data: PaymentMethodConfigUpdate):
    row = db.query(PaymentMethodConfig).filter(PaymentMethodConfig.method == method).first()
    if row:
        row.commission_rate = data.commission_rate
        db.commit()
        db.refresh(row)
        return row
    return None

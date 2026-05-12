from sqlalchemy import Column, Integer, String, Numeric, DateTime, func
from ..database import Base


class IncomeSplitConfig(Base):
    __tablename__ = "income_split_config"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(30), unique=True, nullable=False)  # profit, owner_salary, taxes, operating
    percentage = Column(Numeric(5, 4), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class PaymentMethodConfig(Base):
    __tablename__ = "payment_method_config"

    id = Column(Integer, primary_key=True, index=True)
    method = Column(String(20), unique=True, nullable=False)  # cash, card_debit, card_credit, transfer
    commission_rate = Column(Numeric(5, 4), nullable=False, default=0.0)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

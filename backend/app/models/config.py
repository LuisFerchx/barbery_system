from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import relationship
from ..database import Base


class IncomeSplitConfig(Base):
    __tablename__ = "income_split_config"
    __table_args__ = (UniqueConstraint("name", "company_id", name="uq_split_name_company"),)

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    name = Column(String(30), nullable=False)  # profit, owner_salary, taxes, operating
    percentage = Column(Numeric(5, 4), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    company = relationship("Company")


class PaymentMethodConfig(Base):
    __tablename__ = "payment_method_config"
    __table_args__ = (UniqueConstraint("method", "company_id", name="uq_payment_method_company"),)

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    method = Column(String(20), nullable=False)  # cash, card_debit, card_credit, transfer
    commission_rate = Column(Numeric(5, 4), nullable=False, default=0.0)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    company = relationship("Company")

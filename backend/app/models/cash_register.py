from sqlalchemy import Column, Integer, Numeric, DateTime, Text, ForeignKey, func
from sqlalchemy.orm import relationship
from ..database import Base


class CashRegisterClosing(Base):
    __tablename__ = "cash_register_closings"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    closed_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    closed_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    period_from = Column(DateTime(timezone=True), nullable=False)
    period_to = Column(DateTime(timezone=True), nullable=False)
    sales_cash = Column(Numeric(10, 2), nullable=False, default=0)
    product_sales_cash = Column(Numeric(10, 2), nullable=False, default=0)
    expenses_cash = Column(Numeric(10, 2), nullable=False, default=0)
    expected_cash = Column(Numeric(10, 2), nullable=False)
    actual_cash = Column(Numeric(10, 2), nullable=False)
    discrepancy = Column(Numeric(10, 2), nullable=False)
    notes = Column(Text, nullable=True)

    company = relationship("Company")
    closed_by = relationship("User")

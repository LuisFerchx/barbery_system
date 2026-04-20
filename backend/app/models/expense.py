from sqlalchemy import Column, Integer, String, Float, DateTime, Date, func
from ..database import Base


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False)
    category = Column(String(50), nullable=False)  # toallas, bebidas, internet, luz, agua, arriendo, etc.
    description = Column(String(255))
    amount = Column(Float, nullable=False)
    payment_method = Column(String(30), default="efectivo")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class DailyReport(Base):
    __tablename__ = "daily_reports"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False, unique=True)
    service_income = Column(Float, default=0.0)
    product_income = Column(Float, default=0.0)
    transfer_income = Column(Float, default=0.0)
    cash_income = Column(Float, default=0.0)
    total_income = Column(Float, default=0.0)
    total_expenses = Column(Float, default=0.0)
    net_profit = Column(Float, default=0.0)
    notes = Column(String(500))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

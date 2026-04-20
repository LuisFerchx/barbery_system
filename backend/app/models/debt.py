from sqlalchemy import Column, Integer, String, Float, DateTime, Date, func
from ..database import Base


class Debt(Base):
    __tablename__ = "debts"

    id = Column(Integer, primary_key=True, index=True)
    client_name = Column(String(100), nullable=False)
    client_lastname = Column(String(100))
    client_phone = Column(String(20))
    concept = Column(String(255), nullable=False)
    original_amount = Column(Float, nullable=False)
    paid_amount = Column(Float, default=0.0)
    pending_amount = Column(Float, nullable=False)
    date = Column(Date, nullable=False)
    due_date = Column(Date)
    status = Column(String(20), default="pendiente")  # pendiente, parcial, pagado
    notes = Column(String(500))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class DebtPayment(Base):
    __tablename__ = "debt_payments"

    id = Column(Integer, primary_key=True, index=True)
    debt_id = Column(Integer, nullable=False)
    amount = Column(Float, nullable=False)
    date = Column(Date, nullable=False)
    payment_method = Column(String(30), default="efectivo")
    note = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

from sqlalchemy import Column, Integer, String, Numeric, DateTime, Text, func
from ..database import Base


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime(timezone=True), nullable=False, index=True)
    category = Column(String(30), nullable=False)  # rent, utilities, supplies, marketing, other
    description = Column(Text, nullable=True)
    amount = Column(Numeric(10, 2), nullable=False)
    payment_method = Column(String(20), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

from sqlalchemy import Column, Integer, String, Numeric, DateTime
from sqlalchemy.orm import relationship
from ..database import Base


# Schema exists and links to Sale — not populated by any endpoint yet.
# Activate when bank commission processing is implemented.
class BankTransaction(Base):
    __tablename__ = "bank_transactions"

    id = Column(Integer, primary_key=True, index=True)
    bank_commission_rate = Column(Numeric(5, 4), nullable=True)
    bank_commission_amount = Column(Numeric(10, 2), nullable=True)
    payment_processor = Column(String(100), nullable=True)
    reference = Column(String(255), nullable=True)
    processed_at = Column(DateTime(timezone=True), nullable=True)

    sale = relationship("Sale", back_populates="bank_transaction", uselist=False)

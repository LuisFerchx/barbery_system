from sqlalchemy import Column, Integer, String, Boolean, DateTime, Numeric, Text, ForeignKey, func
from sqlalchemy.orm import relationship
from ..database import Base


class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, index=True)
    number = Column(String(20), unique=True, nullable=False, index=True)
    date = Column(DateTime(timezone=True), nullable=False, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)
    barber_id = Column(Integer, ForeignKey("barbers.id"), nullable=False, index=True)
    service_id = Column(Integer, ForeignKey("service_catalog.id"), nullable=False)
    gross_total = Column(Numeric(10, 2), nullable=False)
    payment_method = Column(String(20), nullable=False)  # cash, card_debit, card_credit, transfer
    is_returning_client = Column(Boolean, default=False)
    barber_commission_amount = Column(Numeric(10, 2), nullable=False)
    real_income = Column(Numeric(10, 2), nullable=False)
    split_profit = Column(Numeric(10, 2), nullable=False)
    split_owner_salary = Column(Numeric(10, 2), nullable=False)
    split_taxes = Column(Numeric(10, 2), nullable=False)
    split_operating = Column(Numeric(10, 2), nullable=False)
    courtesy_drink_given = Column(Boolean, default=False)
    courtesy_drink_item_id = Column(Integer, ForeignKey("inventory_items.id"), nullable=True)
    cross_sell = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)
    bank_transaction_id = Column(Integer, ForeignKey("bank_transactions.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    barber = relationship("Barber", back_populates="sales")
    client = relationship("Client", back_populates="sales")
    service = relationship("ServiceCatalog", back_populates="sales")
    bank_transaction = relationship("BankTransaction", back_populates="sale")
    courtesy_drink_item = relationship("InventoryItem", foreign_keys=[courtesy_drink_item_id])

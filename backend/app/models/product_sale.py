from sqlalchemy import Column, Integer, String, Numeric, DateTime, Text, ForeignKey, func
from sqlalchemy.orm import relationship
from ..database import Base


class ProductSale(Base):
    __tablename__ = "product_sales"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime(timezone=True), nullable=False, index=True)
    barber_id = Column(Integer, ForeignKey("barbers.id"), nullable=False, index=True)
    item_id = Column(Integer, ForeignKey("inventory_items.id"), nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)
    quantity = Column(Numeric(10, 3), nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    subtotal = Column(Numeric(10, 2), nullable=False)
    barber_commission_amount = Column(Numeric(10, 2), nullable=False)
    payment_method = Column(String(20), nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    barber = relationship("Barber", back_populates="product_sales")
    item = relationship("InventoryItem", back_populates="product_sales")
    client = relationship("Client", back_populates="product_sales")
    inventory_movements = relationship("InventoryMovement", back_populates="product_sale")

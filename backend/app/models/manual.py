from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from ..database import Base


class OperatingManualEntry(Base):
    __tablename__ = "operating_manual_entries"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    section = Column(String(50), nullable=False)  # courtesy_protocol, cross_sell_script, checkout_procedure, other
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=True)
    order_index = Column(Integer, default=0)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    updated_by = Column(String(100), nullable=True)

    company = relationship("Company")

import pytest
from decimal import Decimal
from datetime import datetime
from app.models.barber import Barber
from app.models.catalog import ServiceCatalog
from app.models.client import Client
from app.models.inventory import InventoryItem, InventoryMovement
from app.models.sale import Sale
from app.schemas.sale import SaleUpdate
from app.crud.sale import create_sale, update_sale, get_sale
from app.schemas.sale import SaleCreate


@pytest.fixture
def sample_data(db):
    # Create a Barber
    barber = Barber(id=1, company_id=1, name="John", lastname="Doe", commission_rate=Decimal("0.4"))
    db.add(barber)

    # Create a Service
    service = ServiceCatalog(id=1, company_id=1, name="Classic Haircut", category="haircut", price=Decimal("30.0"))
    db.add(service)

    # Create a Client
    client = Client(id=1, company_id=1, name="Alice", lastname="Smith", is_active=True)
    db.add(client)

    # Create a Courtesy Drink Item
    drink = InventoryItem(id=1, company_id=1, name="Soda", category="courtesy", unit="und", stock_current=Decimal("10.0"), stock_minimum=Decimal("2.0"), cost_per_unit=Decimal("0.5"), is_active=True)
    db.add(drink)

    # Create a Second Courtesy Drink Item
    drink2 = InventoryItem(id=2, company_id=1, name="Water", category="courtesy", unit="und", stock_current=Decimal("5.0"), stock_minimum=Decimal("1.0"), cost_per_unit=Decimal("0.2"), is_active=True)
    db.add(drink2)

    db.commit()


def test_update_sale_basic_fields(db, sample_data):
    # 1. Create a Sale
    sale_in = SaleCreate(
        date=datetime.utcnow(),
        client_id=1,
        barber_id=1,
        service_id=1,
        gross_total=Decimal("30.0"),
        payment_method="cash",
        is_returning_client=False,
    )
    sale = create_sale(db, 1, sale_in)
    assert sale.payment_method == "cash"
    assert sale.is_returning_client is False

    # 2. Update basic fields
    update_data = SaleUpdate(
        payment_method="card_debit",
        is_returning_client=True,
        notes="Updated notes",
    )
    updated = update_sale(db, 1, sale.id, update_data)
    assert updated is not None
    assert updated.payment_method == "card_debit"
    assert updated.is_returning_client is True
    assert updated.notes == "Updated notes"


def test_update_sale_courtesy_drink_deduction_and_restoration(db, sample_data):
    # 1. Create a Sale without courtesy drink
    sale_in = SaleCreate(
        date=datetime.utcnow(),
        client_id=1,
        barber_id=1,
        service_id=1,
        gross_total=Decimal("30.0"),
        payment_method="cash",
        courtesy_drink_given=False,
    )
    sale = create_sale(db, 1, sale_in)
    
    # Check initial stock
    drink = db.query(InventoryItem).filter(InventoryItem.id == 1).first()
    assert drink.stock_current == Decimal("10.0")

    # 2. Edit sale to ADD courtesy drink
    update_data = SaleUpdate(
        courtesy_drink_given=True,
        courtesy_drink_item_id=1,
    )
    updated = update_sale(db, 1, sale.id, update_data)
    assert updated.courtesy_drink_given is True
    assert updated.courtesy_drink_item_id == 1

    # Check that stock was deducted
    db.refresh(drink)
    assert drink.stock_current == Decimal("9.0")
    
    # Check that inventory movement was recorded
    movement = db.query(InventoryMovement).filter(InventoryMovement.item_id == 1).first()
    assert movement is not None
    assert movement.movement_type == "out"

    # 3. Edit sale to CHANGE courtesy drink to item 2
    update_data2 = SaleUpdate(
        courtesy_drink_item_id=2,
    )
    updated = update_sale(db, 1, sale.id, update_data2)
    assert updated.courtesy_drink_item_id == 2

    # Check item 1 stock restored, and item 2 stock deducted
    db.refresh(drink)
    assert drink.stock_current == Decimal("10.0")  # restored

    drink2 = db.query(InventoryItem).filter(InventoryItem.id == 2).first()
    assert drink2.stock_current == Decimal("4.0")  # deducted

    # 4. Edit sale to REMOVE courtesy drink entirely
    update_data3 = SaleUpdate(
        courtesy_drink_given=False,
    )
    updated = update_sale(db, 1, sale.id, update_data3)
    assert updated.courtesy_drink_given is False
    assert updated.courtesy_drink_item_id is None

    # Check item 2 stock restored
    db.refresh(drink2)
    assert drink2.stock_current == Decimal("5.0")  # restored

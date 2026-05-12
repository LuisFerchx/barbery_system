import pytest
from datetime import date
from app.models.bank import Bank
from app.models.barber import Barber


@pytest.fixture
def barber(db):
    b = Barber(name="Juan", commission_rate=0.3)
    db.add(b)
    db.commit()
    db.refresh(b)
    return b


@pytest.fixture
def bank(db):
    bk = Bank(name="Pichincha", account="1234567890")
    db.add(bk)
    db.commit()
    db.refresh(bk)
    return bk


def test_create_sale_without_bank_transfer(client, barber):
    payload = {
        "date": str(date.today()),
        "client_name": "Ana",
        "barber_id": barber.id,
        "total": 15.0,
        "bank_transfer_value": 0.0,
    }
    r = client.post("/api/v1/sales/", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert data["bank_transfer_id"] is None
    assert data["bank_transfer_value"] == 0.0
    assert data["bank_name"] is None


def test_create_sale_with_bank_transfer(client, barber, bank):
    payload = {
        "date": str(date.today()),
        "client_name": "Luis",
        "barber_id": barber.id,
        "total": 20.0,
        "bank_transfer_id": bank.id,
        "bank_transfer_value": 20.0,
    }
    r = client.post("/api/v1/sales/", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert data["bank_transfer_id"] == bank.id
    assert data["bank_transfer_value"] == 20.0
    assert data["bank_name"] == "Pichincha"


def test_list_sales(client, barber):
    payload = {"date": str(date.today()), "client_name": "Pedro", "barber_id": barber.id, "total": 10.0}
    client.post("/api/v1/sales/", json=payload)

    r = client.get("/api/v1/sales/")
    assert r.status_code == 200
    assert r.json()["total"] >= 1


def test_update_sale_bank_transfer(client, barber, bank):
    create_r = client.post("/api/v1/sales/", json={
        "date": str(date.today()),
        "client_name": "Maria",
        "barber_id": barber.id,
        "total": 30.0,
    })
    sale_id = create_r.json()["id"]

    update_r = client.put(f"/api/v1/sales/{sale_id}", json={
        "bank_transfer_id": bank.id,
        "bank_transfer_value": 30.0,
    })
    assert update_r.status_code == 200
    data = update_r.json()
    assert data["bank_transfer_id"] == bank.id
    assert data["bank_transfer_value"] == 30.0
    assert data["bank_name"] == "Pichincha"


def test_daily_summary_transfer_income(client, barber, bank):
    today = str(date.today())
    client.post("/api/v1/sales/", json={
        "date": today, "client_name": "A", "barber_id": barber.id,
        "total": 50.0, "bank_transfer_id": bank.id, "bank_transfer_value": 50.0,
    })
    client.post("/api/v1/sales/", json={
        "date": today, "client_name": "B", "barber_id": barber.id,
        "total": 30.0, "bank_transfer_value": 0.0,
    })

    r = client.get("/api/v1/sales/daily-summary", params={"target_date": today})
    assert r.status_code == 200
    summary = r.json()
    assert summary["transfer_income"] == 50.0
    assert summary["cash_income"] == 30.0
    assert summary["total_sales"] == 2

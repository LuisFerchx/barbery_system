from app.models.bank import Bank


def test_list_banks_empty(client):
    r = client.get("/api/v1/banks/")
    assert r.status_code == 200
    assert r.json() == []


def test_list_banks(client, db):
    db.add(Bank(name="Pichincha", account="1234567890"))
    db.add(Bank(name="Austro", account=None))
    db.commit()

    r = client.get("/api/v1/banks/")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 2
    names = [b["name"] for b in data]
    assert "Pichincha" in names
    assert "Austro" in names


def test_bank_has_account_field(client, db):
    db.add(Bank(name="JEP", account="0987654321"))
    db.commit()

    r = client.get("/api/v1/banks/")
    assert r.status_code == 200
    jep = next(b for b in r.json() if b["name"] == "JEP")
    assert jep["account"] == "0987654321"


def test_bank_account_can_be_null(client, db):
    db.add(Bank(name="Guayaquil", account=None))
    db.commit()

    r = client.get("/api/v1/banks/")
    guaya = next(b for b in r.json() if b["name"] == "Guayaquil")
    assert guaya["account"] is None

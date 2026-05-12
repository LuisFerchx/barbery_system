from sqlalchemy.orm import Session
from ..models.manual import OperatingManualEntry
from ..schemas.manual import ManualEntryCreate, ManualEntryUpdate


def get_entries(db: Session, section: str = None):
    q = db.query(OperatingManualEntry)
    if section:
        q = q.filter(OperatingManualEntry.section == section)
    return q.order_by(OperatingManualEntry.section, OperatingManualEntry.order_index).all()


def get_entry(db: Session, entry_id: int):
    return db.query(OperatingManualEntry).filter(OperatingManualEntry.id == entry_id).first()


def create_entry(db: Session, entry: ManualEntryCreate):
    db_obj = OperatingManualEntry(**entry.model_dump())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def update_entry(db: Session, entry_id: int, entry: ManualEntryUpdate):
    db_obj = get_entry(db, entry_id)
    if not db_obj:
        return None
    for k, v in entry.model_dump(exclude_unset=True).items():
        setattr(db_obj, k, v)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def delete_entry(db: Session, entry_id: int):
    db_obj = get_entry(db, entry_id)
    if db_obj:
        db.delete(db_obj)
        db.commit()
    return db_obj

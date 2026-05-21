import time
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from ....database import get_db
from ....crud import barber as crud
from ....schemas.barber import BarberCreate, BarberUpdate, BarberOut
from ....security import get_current_user, require_admin, get_company_id
from ....utils.supabase import get_supabase, get_bucket, attach_signed_url

router = APIRouter()


@router.get("/", response_model=List[BarberOut])
def list_barbers(
    active_only: bool = False,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
    company_id: int = Depends(get_company_id),
):
    barbers = crud.get_barbers(db, company_id, active_only=active_only)
    for b in barbers:
        attach_signed_url(b, "photo_url")
    return barbers


@router.post("/", response_model=BarberOut)
def create_barber(
    data: BarberCreate,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
    company_id: int = Depends(get_company_id),
):
    return crud.create_barber(db, company_id, data)


@router.get("/{barber_id}", response_model=BarberOut)
def get_barber(
    barber_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
    company_id: int = Depends(get_company_id),
):
    obj = crud.get_barber(db, company_id, barber_id)
    if not obj:
        raise HTTPException(404, "Barbero no encontrado")
    attach_signed_url(obj, "photo_url")
    return obj


@router.put("/{barber_id}", response_model=BarberOut)
def update_barber(
    barber_id: int,
    data: BarberUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
    company_id: int = Depends(get_company_id),
):
    obj = crud.update_barber(db, company_id, barber_id, data)
    if not obj:
        raise HTTPException(404, "Barbero no encontrado")
    return obj


@router.post("/{barber_id}/photo", response_model=BarberOut)
async def upload_barber_photo(
    barber_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _=Depends(require_admin),
    company_id: int = Depends(get_company_id),
):
    barber = crud.get_barber(db, company_id, barber_id)
    if not barber:
        raise HTTPException(404, "Barbero no encontrado")

    ext = (
        file.filename.rsplit(".", 1)[-1].lower()
        if file.filename and "." in file.filename
        else "jpg"
    )
    path = f"barbers/{company_id}/{barber_id}_{int(time.time())}.{ext}"

    supabase = get_supabase()
    supabase.storage.from_(get_bucket()).upload(
        path=path,
        file=await file.read(),
        file_options={
            "content-type": file.content_type or "image/jpeg",
            "upsert": "true",
        },
    )

    barber.photo_url = path
    db.commit()
    db.refresh(barber)
    attach_signed_url(barber, "photo_url")
    return barber

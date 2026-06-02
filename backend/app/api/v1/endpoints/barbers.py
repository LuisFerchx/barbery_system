import time
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from ....database import get_db
from ....crud import barber as crud
from ....crud import barber_hours as hours_crud
from ....schemas.barber import BarberCreate, BarberUpdate, BarberOut, BarberServiceTypesUpdate
from ....schemas.barber_hours import BarberHoursCreate, BarberHoursUpdate, BarberHoursOut
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
    """
    Upload an image for a barber, store it in company object storage, and update the barber's photo URL.
    
    Parameters:
        barber_id (int): ID of the barber to update.
        file (UploadFile): Image file to upload; used as the barber's new photo.
        db (Session): Database session dependency.
        company_id (int): Tenant company ID dependency.
    
    Returns:
        barber: The updated barber object with `photo_url` replaced by a signed URL.
    
    Raises:
        HTTPException: 404 if the barber does not exist.
    """
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


@router.put("/{barber_id}/service-types/", response_model=BarberOut)
def update_barber_service_types(
    barber_id: int,
    data: BarberServiceTypesUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
    company_id: int = Depends(get_company_id),
):
    obj = crud.update_barber_service_types(db, company_id, barber_id, data.service_type_ids)
    if not obj:
        raise HTTPException(404, "Barbero no encontrado")
    return obj


@router.get("/{barber_id}/hours/", response_model=List[BarberHoursOut])
def list_barber_hours(
    barber_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
    company_id: int = Depends(get_company_id),
):
    """
    Retrieve hours entries for the specified barber.
    
    Parameters:
        barber_id (int): ID of the barber to list hours for.
    
    Returns:
        List[BarberHoursOut]: A list of the barber's hours records.
    
    Raises:
        HTTPException: 404 with message "Barbero no encontrado" if the barber does not exist.
    """
    barber = crud.get_barber(db, company_id, barber_id)
    if not barber:
        raise HTTPException(404, "Barbero no encontrado")
    return hours_crud.get_barber_hours(db, company_id, barber_id)


@router.post("/{barber_id}/hours/", response_model=BarberHoursOut)
def create_barber_hours(
    barber_id: int,
    data: BarberHoursCreate,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
    company_id: int = Depends(get_company_id),
):
    """
    Create a barber hours entry for the specified barber.
    
    Parameters:
        barber_id (int): ID of the barber to attach the hours to.
        data (BarberHoursCreate): Data for the barber hours to create.
    
    Returns:
        BarberHoursOut: The created barber hours record.
    
    Raises:
        HTTPException: 404 if the barber with `barber_id` does not exist.
    """
    barber = crud.get_barber(db, company_id, barber_id)
    if not barber:
        raise HTTPException(404, "Barbero no encontrado")
    return hours_crud.create_barber_hours(db, company_id, barber_id, data)


@router.put("/hours/{hours_id}/", response_model=BarberHoursOut)
def update_barber_hours(
    hours_id: int,
    data: BarberHoursUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
    company_id: int = Depends(get_company_id),
):
    """
    Update an existing barber hours record for the current company.
    
    Parameters:
    	hours_id (int): Identifier of the hours record to update.
    	data (BarberHoursUpdate): Fields to apply to the hours record.
    
    Returns:
    	barber_hours (BarberHoursOut): The updated barber hours record.
    
    Raises:
    	HTTPException: 404 if the specified hours record is not found.
    """
    obj = hours_crud.update_barber_hours(db, company_id, hours_id, data)
    if not obj:
        raise HTTPException(404, "Horario bloqueado no encontrado")
    return obj


@router.delete("/hours/{hours_id}/", response_model=BarberHoursOut)
def delete_barber_hours(
    hours_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
    company_id: int = Depends(get_company_id),
):
    """
    Delete a barber's blocked hours record.
    
    Parameters:
        hours_id (int): Identifier of the barber hours record to delete.
    
    Returns:
        The deleted barber hours record.
    
    Raises:
        HTTPException: 404 if the specified hours record is not found.
    """
    obj = hours_crud.delete_barber_hours(db, company_id, hours_id)
    if not obj:
        raise HTTPException(404, "Horario bloqueado no encontrado")
    return obj

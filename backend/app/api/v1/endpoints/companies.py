from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List
from ....database import get_db
from ....crud import company as crud
from ....crud.user import create_user, get_user_by_username
from ....crud.config import seed_company_defaults
from ....models.company import Company
from ....models.user import User
from ....schemas.company import CompanyCreate, CompanyUpdate, CompanyOut, CompanySetupCreate
from ....schemas.user import UserCreate, UserOut
from ....security import require_superadmin, require_admin, hash_password

router = APIRouter()


@router.get("/", response_model=List[CompanyOut])
def list_companies(db: Session = Depends(get_db), _=Depends(require_superadmin)):
    return crud.get_companies(db)


@router.post("/", response_model=CompanyOut, status_code=201)
def create_company(data: CompanyCreate, db: Session = Depends(get_db), _=Depends(require_superadmin)):
    if crud.get_company_by_slug(db, data.slug):
        raise HTTPException(400, f"El slug '{data.slug}' ya está en uso")
    return crud.create_company(db, data)


@router.get("/me", response_model=CompanyOut)
def get_my_company(db: Session = Depends(get_db), current_user=Depends(require_admin)):
    if not current_user.company_id:
        raise HTTPException(400, "Usuario sin empresa asignada")
    obj = crud.get_company(db, current_user.company_id)
    if not obj:
        raise HTTPException(404, "Empresa no encontrada")
    return obj


@router.put("/me", response_model=CompanyOut)
def update_my_company(
    data: CompanyUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    if not current_user.company_id:
        raise HTTPException(400, "Usuario sin empresa asignada")
    obj = crud.update_company(db, current_user.company_id, data)
    if not obj:
        raise HTTPException(404, "Empresa no encontrada")
    return obj


@router.get("/{company_id}", response_model=CompanyOut)
def get_company(company_id: int, db: Session = Depends(get_db), _=Depends(require_superadmin)):
    obj = crud.get_company(db, company_id)
    if not obj:
        raise HTTPException(404, "Empresa no encontrada")
    return obj


@router.put("/{company_id}", response_model=CompanyOut)
def update_company(
    company_id: int,
    data: CompanyUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_superadmin),
):
    if data.slug:
        existing = crud.get_company_by_slug(db, data.slug)
        if existing and existing.id != company_id:
            raise HTTPException(400, f"El slug '{data.slug}' ya está en uso")
    obj = crud.update_company(db, company_id, data)
    if not obj:
        raise HTTPException(404, "Empresa no encontrada")
    return obj


@router.post("/setup/", response_model=CompanyOut, status_code=201)
def setup_company(
    data: CompanySetupCreate,
    db: Session = Depends(get_db),
    _=Depends(require_superadmin),
):
    if crud.get_company_by_slug(db, data.slug):
        raise HTTPException(400, f"El slug '{data.slug}' ya está en uso")
    if data.admin and get_user_by_username(db, data.admin.username):
        raise HTTPException(400, f"El usuario '{data.admin.username}' ya existe")
    try:
        company = Company(
            name=data.name,
            slug=data.slug,
            phone=data.phone,
            address=data.address,
        )
        db.add(company)
        db.flush()  # get company.id without committing

        seed_company_defaults(db, company.id, commit=False)

        if data.admin:
            db.add(User(
                username=data.admin.username,
                hashed_password=hash_password(data.admin.password),
                full_name=data.admin.full_name,
                email=data.admin.email,
                role="admin",
                company_id=company.id,
            ))

        db.commit()
        db.refresh(company)
        return company
    except IntegrityError:
        db.rollback()
        raise HTTPException(400, "Error de integridad: slug o email ya en uso")


@router.post("/{company_id}/users/", response_model=UserOut, status_code=201)
def create_company_user(
    company_id: int,
    data: UserCreate,
    db: Session = Depends(get_db),
    _=Depends(require_superadmin),
):
    if not crud.get_company(db, company_id):
        raise HTTPException(404, "Empresa no encontrada")
    if get_user_by_username(db, data.username):
        raise HTTPException(400, f"El usuario '{data.username}' ya existe")
    try:
        return create_user(db, company_id, data)
    except IntegrityError:
        db.rollback()
        raise HTTPException(400, "El email ya está en uso")

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ....database import get_db
from ....schemas.user import UserCreate, UserUpdate, UserOut
from ....crud.user import get_users, create_user, update_user, delete_user
from ....security import require_admin, get_company_id

router = APIRouter()


@router.get("/", response_model=List[UserOut])
def list_users(
    db: Session = Depends(get_db),
    _=Depends(require_admin),
    company_id: int = Depends(get_company_id),
):
    return get_users(db, company_id)


@router.post("/", response_model=UserOut)
def new_user(
    user: UserCreate,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
    company_id: int = Depends(get_company_id),
):
    return create_user(db, company_id, user)


@router.put("/{user_id}", response_model=UserOut)
def edit_user(
    user_id: int,
    user: UserUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
    company_id: int = Depends(get_company_id),
):
    db_user = update_user(db, company_id, user_id, user)
    if not db_user:
        raise HTTPException(404, "Usuario no encontrado")
    return db_user


@router.delete("/{user_id}")
def remove_user(
    user_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
    company_id: int = Depends(get_company_id),
):
    delete_user(db, company_id, user_id)
    return {"ok": True}

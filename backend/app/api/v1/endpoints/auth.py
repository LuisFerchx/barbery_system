from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ....database import get_db
from ....schemas.user import TokenOut, LoginRequest, RefreshRequest, UserOut, UserCreate
from ....crud.user import get_user_by_username, create_user, get_users
from ....security import verify_password, create_access_token, create_refresh_token, decode_token, get_current_user

router = APIRouter()


@router.post("/login", response_model=TokenOut)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = get_user_by_username(db, data.username)
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales inválidas")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario inactivo")
    return TokenOut(
        access_token=create_access_token({"sub": user.username, "role": user.role}),
        refresh_token=create_refresh_token({"sub": user.username}),
    )


@router.post("/refresh", response_model=TokenOut)
def refresh(data: RefreshRequest, db: Session = Depends(get_db)):
    payload = decode_token(data.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=400, detail="Token no es de refresco")
    user = get_user_by_username(db, payload.get("sub"))
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Usuario inactivo")
    return TokenOut(
        access_token=create_access_token({"sub": user.username, "role": user.role}),
        refresh_token=create_refresh_token({"sub": user.username}),
    )


@router.get("/me", response_model=UserOut)
def me(current_user=Depends(get_current_user)):
    out = UserOut.model_validate(current_user)
    if current_user.company:
        out.company_name = current_user.company.name
        out.commission_by_service = current_user.company.commission_by_service
    return out

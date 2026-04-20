from fastapi import APIRouter
from .endpoints import auth, users, barbers, sales, services, inventory, accounting, debts

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(barbers.router, prefix="/barbers", tags=["barbers"])
api_router.include_router(sales.router, prefix="/sales", tags=["sales"])
api_router.include_router(services.router, prefix="/catalog", tags=["catalog"])
api_router.include_router(inventory.router, prefix="/inventory", tags=["inventory"])
api_router.include_router(accounting.router, prefix="/accounting", tags=["accounting"])
api_router.include_router(debts.router, prefix="/debts", tags=["debts"])

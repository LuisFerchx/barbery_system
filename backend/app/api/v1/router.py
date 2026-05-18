from fastapi import APIRouter
from .endpoints import (
    auth, users,
    barbers, clients,
    sales, product_sales,
    catalog, inventory,
    expenses, analytics, dashboard,
    config, manual, companies, cash_register,
    appointments,
)

api_router = APIRouter()

api_router.include_router(companies.router, prefix="/companies", tags=["companies"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(barbers.router, prefix="/barbers", tags=["barbers"])
api_router.include_router(clients.router, prefix="/clients", tags=["clients"])
api_router.include_router(sales.router, prefix="/sales", tags=["sales"])
api_router.include_router(product_sales.router, prefix="/product-sales", tags=["product-sales"])
api_router.include_router(catalog.router, prefix="/catalog", tags=["catalog"])
api_router.include_router(inventory.router, prefix="/inventory", tags=["inventory"])
api_router.include_router(expenses.router, prefix="/expenses", tags=["expenses"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(config.router, prefix="/config", tags=["config"])
api_router.include_router(manual.router, prefix="/manual", tags=["manual"])
api_router.include_router(cash_register.router, prefix="/cash-register", tags=["cash-register"])
api_router.include_router(appointments.router, prefix="/appointments", tags=["appointments"])

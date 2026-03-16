from app.api.v1.endpoints import auth, invitations, organizations
from fastapi import APIRouter

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(organizations.router, prefix="/organizations", tags=["organizations"])
api_router.include_router(invitations.router, prefix="/invitations", tags=["invitations"])

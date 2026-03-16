import uuid
from typing import Any, Dict, List

from app.db.dependencies import get_async_db
from app.models.user import User
from app.schemas.organization import (
    OrganizationCreate,
    OrganizationDisplay,
    OrganizationInvite,
    OrganizationInviteDisplay,
    OrganizationUpdate,
    OrganizationUser,
)
from app.services.jwt import JWTService
from app.services.organization import OrganizationService
from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


@router.get("/", response_model=List[OrganizationDisplay])
async def get_organizations(current_user: User = Depends(JWTService.get_current_active_user), db: AsyncSession = Depends(get_async_db)):
    """
    Get all organizations for the current user.
    """
    organization_service = OrganizationService(db)
    organizations = await organization_service.get_user_organizations(current_user.id)
    return organizations


@router.post("/", response_model=OrganizationDisplay, status_code=status.HTTP_201_CREATED)
async def create_organization(organization_data: OrganizationCreate, current_user: User = Depends(JWTService.get_current_active_user), db: AsyncSession = Depends(get_async_db)):
    """
    Create a new organization.
    """
    organization_service = OrganizationService(db)
    organization = await organization_service.create_organization({**organization_data.dict(), "owner_id": current_user.id})

    # Convert the organization model to the display schema format
    return {"id": str(organization.id), "name": organization.name, "description": organization.description, "owner_id": str(organization.owner_id), "is_default": organization.is_default, "created_at": organization.created_at}


@router.get("/{organization_id}", response_model=OrganizationDisplay)
async def get_organization(organization_id: str = Path(..., description="Organization ID in UUID format"), current_user: User = Depends(JWTService.get_current_active_user), db: AsyncSession = Depends(get_async_db)):
    """
    Get a specific organization by ID.
    """
    try:
        organization_uuid = uuid.UUID(organization_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid organization ID format. Please provide a valid UUID.")

    organization_service = OrganizationService(db)
    organization = await organization_service.get_organization_by_id(organization_uuid)

    if not organization:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    # Check if user has access to the organization
    user_organizations = await organization_service.get_user_organizations(current_user.id)
    organization_ids = [w["id"] for w in user_organizations]
    if str(organization_uuid) not in organization_ids:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You don't have access to this organization")

    return {"id": str(organization.id), "name": organization.name, "description": organization.description, "owner_id": str(organization.owner_id), "is_default": organization.is_default, "created_at": organization.created_at}


@router.put("/{organization_id}", response_model=OrganizationDisplay)
async def update_organization(organization_id: uuid.UUID, organization_data: OrganizationUpdate, current_user: User = Depends(JWTService.get_current_active_user), db: AsyncSession = Depends(get_async_db)):
    """
    Update a organization.
    """
    organization_service = OrganizationService(db)
    organization = await organization_service.get_organization_by_id(organization_id)

    if not organization:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    # Only owner can update organization
    if organization.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the organization owner can update it")

    updated_organization = await organization_service.update_organization(organization_id, organization_data.dict(exclude_unset=True))

    # Convert the organization model to the display schema format
    return {
        "id": str(updated_organization.id),
        "name": updated_organization.name,
        "description": updated_organization.description,
        "owner_id": str(updated_organization.owner_id),
        "is_default": updated_organization.is_default,
        "created_at": updated_organization.created_at,
    }


@router.delete("/{organization_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_organization(organization_id: uuid.UUID = Path(...), current_user: User = Depends(JWTService.get_current_active_user), db: AsyncSession = Depends(get_async_db)):
    """
    Delete a organization.
    """
    organization_service = OrganizationService(db)
    organization = await organization_service.get_organization_by_id(organization_id)

    if not organization:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    # Only owner can delete organization
    if organization.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the organization owner can delete it")

    # Cannot delete default organization
    if organization.is_default:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete default organization")

    await organization_service.delete_organization(organization_id)
    return None


@router.get("/{organization_id}/users", response_model=List[OrganizationUser])
async def get_organization_users(organization_id: str = Path(..., description="Organization ID in UUID format"), current_user: User = Depends(JWTService.get_current_active_user), db: AsyncSession = Depends(get_async_db)):
    """
    Get all users in a organization.
    """
    try:
        organization_uuid = uuid.UUID(organization_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid organization ID format. Please provide a valid UUID.")

    organization_service = OrganizationService(db)
    organization = await organization_service.get_organization_by_id(organization_uuid)

    if not organization:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    # Check if user has access to the organization
    user_organizations = await organization_service.get_user_organizations(current_user.id)
    organization_ids = [w["id"] for w in user_organizations]
    if str(organization_uuid) not in organization_ids:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You don't have access to this organization")

    users = await organization_service.get_organization_users(organization_uuid)
    return users


@router.post("/{organization_id}/invite", response_model=OrganizationInviteDisplay)
async def invite_to_organization(invite_data: OrganizationInvite, organization_id: uuid.UUID = Path(...), current_user: User = Depends(JWTService.get_current_active_user), db: AsyncSession = Depends(get_async_db)):
    """
    Invite a user to a organization.
    """
    organization_service = OrganizationService(db)
    organization = await organization_service.get_organization_by_id(organization_id)

    if not organization:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    # Check if user has admin privileges
    users = await organization_service.get_organization_users(organization_id)
    current_user_role = None
    for user in users:
        if user["id"] == str(current_user.id):
            current_user_role = user["role"]
            break

    if not current_user_role or current_user_role not in ["admin", "owner"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can invite users to the organization")

    invitation = await organization_service.create_invitation(organization_id, current_user.id, invite_data.email, invite_data.role)

    if not invitation:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Could not create invitation")

    # Convert UUID fields to strings for response
    return {"id": str(invitation.id), "organization_id": str(invitation.organization_id), "invitee_email": invitation.invitee_email, "role": invitation.role, "status": invitation.status, "token": invitation.token, "expires_at": invitation.expires_at}


@router.post("/{organization_id}/users/{user_id}/role")
async def update_user_role(role: str = Query(...), organization_id: uuid.UUID = Path(...), user_id: uuid.UUID = Path(...), current_user: User = Depends(JWTService.get_current_active_user), db: AsyncSession = Depends(get_async_db)):
    """
    Update a user's role in a organization.
    """
    organization_service = OrganizationService(db)
    organization = await organization_service.get_organization_by_id(organization_id)

    if not organization:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    # Check if user has admin privileges
    users = await organization_service.get_organization_users(organization_id)
    current_user_role = None
    for user in users:
        if user["id"] == str(current_user.id):
            current_user_role = user["role"]
            break

    if not current_user_role or current_user_role not in ["admin", "owner"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can update user roles")

    # Owner cannot be demoted
    if organization.owner_id == user_id and role != "admin":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot change the role of the organization owner")

    success = await organization_service.update_user_role(organization_id, user_id, role)

    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to update user role")

    return {"message": "User role updated successfully"}


@router.delete("/{organization_id}/users/{user_id}")
async def remove_user_from_organization(organization_id: uuid.UUID = Path(...), user_id: uuid.UUID = Path(...), current_user: User = Depends(JWTService.get_current_active_user), db: AsyncSession = Depends(get_async_db)):
    """
    Remove a user from a organization.
    """
    organization_service = OrganizationService(db)
    organization = await organization_service.get_organization_by_id(organization_id)

    if not organization:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    # Check if user has admin privileges
    users = await organization_service.get_organization_users(organization_id)
    current_user_role = None
    for user in users:
        if user["id"] == str(current_user.id):
            current_user_role = user["role"]
            break

    if not current_user_role or current_user_role not in ["admin", "owner"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can remove users from the organization")

    # Owner cannot be removed
    if organization.owner_id == user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot remove the organization owner")

    success = await organization_service.remove_user_from_organization(organization_id, user_id)

    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to remove user from organization")

    return {"message": "User removed from organization successfully"}

from datetime import datetime, timezone

from app.db.dependencies import get_async_db
from app.models.user import User
from app.schemas.organization import OrganizationInviteAccept, UserInvitationsResponse
from app.services.jwt import JWTService
from app.services.organization import OrganizationService
from fastapi import APIRouter, Depends, HTTPException, Path, status
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


@router.get("/{token}")
async def get_invitation(token: str = Path(...), db: AsyncSession = Depends(get_async_db)):
    """
    Get invitation details from a token.
    """
    organization_service = OrganizationService(db)
    invitation = await organization_service.get_invitation_by_token(token)

    if not invitation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitation not found")

    # Check if invitation has expired - using timezone-aware datetime
    now = datetime.now(timezone.utc)
    if invitation.expires_at < now:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invitation has expired")

    return {"organization_id": str(invitation.organization_id), "invitee_email": invitation.invitee_email, "role": invitation.role, "status": invitation.status, "token": invitation.token}


@router.post("/accept")
async def accept_invitation(invitation_data: OrganizationInviteAccept, current_user: User = Depends(JWTService.get_current_active_user), db: AsyncSession = Depends(get_async_db)):
    """
    Accept an invitation to a organization.
    """
    organization_service = OrganizationService(db)
    result = await organization_service.process_invitation(invitation_data.token, current_user.id, "accept")

    if "error" in result:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=result["error"])

    return {"message": "Invitation accepted successfully"}


@router.post("/reject")
async def reject_invitation(invitation_data: OrganizationInviteAccept, current_user: User = Depends(JWTService.get_current_active_user), db: AsyncSession = Depends(get_async_db)):
    """
    Reject an invitation to a organization.
    """
    organization_service = OrganizationService(db)
    result = await organization_service.process_invitation(invitation_data.token, current_user.id, "reject")

    if "error" in result:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=result["error"])

    return {"message": "Invitation rejected successfully"}


@router.get("/", response_model=UserInvitationsResponse)
async def get_user_invitations(current_user: User = Depends(JWTService.get_current_active_user), db: AsyncSession = Depends(get_async_db)):
    """
    Get all invitations for the current user, both sent and received.

    Returns a dictionary with two keys:
    - "sent": List of invitations sent by the user
    - "received": List of invitations received by the user
    """
    organization_service = OrganizationService(db)
    invitations = await organization_service.get_user_invitations(current_user.id, current_user.email)
    return invitations

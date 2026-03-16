import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from app.models.invitation import Invitation, InvitationStatus
from app.models.organization import Organization
from app.models.user import User, user_organization
from sqlalchemy import delete, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select


class OrganizationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_organization_by_id(self, organization_id: uuid.UUID) -> Optional[Organization]:
        """
        Get a organization by ID.
        """
        result = await self.db.execute(select(Organization).filter(Organization.id == organization_id))
        return result.scalars().first()

    async def get_user_organizations(self, user_id: uuid.UUID) -> List[Dict[str, Any]]:
        """
        Get all organizations for a user.
        """
        result = await self.db.execute(select(Organization, user_organization.c.role).join(user_organization).where(user_organization.c.user_id == user_id))
        organizations = []
        for organization, role in result.all():
            organizations.append(
                {
                    "id": str(organization.id),
                    "name": organization.name,
                    "description": organization.description,
                    "owner_id": str(organization.owner_id),
                    "is_default": organization.is_default,
                    "created_at": organization.created_at,
                    "updated_at": organization.updated_at,
                }
            )
        return organizations

    async def create_organization(self, organization_data: Dict[str, Any]) -> Organization:
        """
        Create a new organization.
        """
        organization = Organization(name=organization_data["name"], description=organization_data.get("description"), owner_id=organization_data["owner_id"], is_default=organization_data.get("is_default", False))
        self.db.add(organization)
        await self.db.commit()
        await self.db.refresh(organization)

        # Add the owner to the organization with admin role
        await self.db.execute(user_organization.insert().values(user_id=organization_data["owner_id"], organization_id=organization.id, role="admin"))
        await self.db.commit()

        return organization

    async def update_organization(self, organization_id: uuid.UUID, organization_data: Dict[str, Any]) -> Optional[Organization]:
        """
        Update an existing organization.
        """
        organization = await self.get_organization_by_id(organization_id)
        if not organization:
            return None

        # Update organization fields
        for key, value in organization_data.items():
            if hasattr(organization, key):
                setattr(organization, key, value)

        await self.db.commit()
        await self.db.refresh(organization)
        return organization

    async def delete_organization(self, organization_id: uuid.UUID) -> bool:
        """
        Delete a organization.
        """
        organization = await self.get_organization_by_id(organization_id)
        if not organization:
            return False

        # First delete association records
        await self.db.execute(delete(user_organization).where(user_organization.c.organization_id == organization_id))

        # Delete invitations
        await self.db.execute(delete(Invitation).where(Invitation.organization_id == organization_id))

        # Then delete the organization
        await self.db.delete(organization)
        await self.db.commit()
        return True

    async def add_user_to_organization(self, organization_id: uuid.UUID, user_id: uuid.UUID, role: str = "member") -> bool:
        """
        Add a user to a organization.
        """
        # Check if organization exists
        organization = await self.get_organization_by_id(organization_id)
        if not organization:
            return False

        # Check if user is already in the organization
        exists = await self.db.execute(select(user_organization).where((user_organization.c.organization_id == organization_id) & (user_organization.c.user_id == user_id)))
        if exists.scalar_one_or_none():
            # Update role if user is already in organization
            await self.db.execute(update(user_organization).where((user_organization.c.organization_id == organization_id) & (user_organization.c.user_id == user_id)).values(role=role))
        else:
            # Add user to organization
            await self.db.execute(user_organization.insert().values(user_id=user_id, organization_id=organization_id, role=role))

        await self.db.commit()
        return True

    async def remove_user_from_organization(self, organization_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        """
        Remove a user from a organization.
        """
        result = await self.db.execute(delete(user_organization).where((user_organization.c.organization_id == organization_id) & (user_organization.c.user_id == user_id)))
        await self.db.commit()
        return result.rowcount > 0

    async def update_user_role(self, organization_id: uuid.UUID, user_id: uuid.UUID, role: str) -> bool:
        """
        Update a user's role in a organization.
        """
        result = await self.db.execute(update(user_organization).where((user_organization.c.organization_id == organization_id) & (user_organization.c.user_id == user_id)).values(role=role))
        await self.db.commit()
        return result.rowcount > 0

    async def get_organization_users(self, organization_id: uuid.UUID) -> List[Dict[str, Any]]:
        """
        Get all users in a organization with their roles.
        """
        result = await self.db.execute(select(User, user_organization.c.role).join(user_organization, User.id == user_organization.c.user_id).where(user_organization.c.organization_id == organization_id))
        users = []
        for user, role in result.all():
            users.append({"id": str(user.id), "email": user.email, "role": role})
        return users

    async def create_invitation(self, organization_id: uuid.UUID, inviter_id: uuid.UUID, invitee_email: str, role: str = "member") -> Optional[Invitation]:
        """
        Create an invitation to a organization.
        """
        # Check if organization exists
        organization = await self.get_organization_by_id(organization_id)
        if not organization:
            return None

        # Generate unique token
        token = str(uuid.uuid4())

        # Set expiry to 7 days - use timezone-aware datetime
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)

        invitation = Invitation(organization_id=organization_id, inviter_id=inviter_id, invitee_email=invitee_email, role=role, token=token, expires_at=expires_at)

        self.db.add(invitation)
        await self.db.commit()
        await self.db.refresh(invitation)
        return invitation

    async def get_invitation_by_token(self, token: str) -> Optional[Invitation]:
        """
        Get an invitation by token.
        """
        result = await self.db.execute(select(Invitation).filter(Invitation.token == token))
        return result.scalars().first()

    async def process_invitation(self, token: str, user_id: uuid.UUID, action: str) -> Dict[str, Any]:
        """
        Process an invitation (accept or reject).
        """
        invitation = await self.get_invitation_by_token(token)
        if not invitation:
            return {"error": "Invitation not found"}

        # Check if invitation has expired - use timezone-aware datetime
        now = datetime.now(timezone.utc)
        if invitation.expires_at < now:
            invitation.status = InvitationStatus.EXPIRED.value
            await self.db.commit()
            return {"error": "Invitation has expired"}

        if action == "accept":
            # Add user to organization
            success = await self.add_user_to_organization(invitation.organization_id, user_id, invitation.role)

            if success:
                invitation.status = InvitationStatus.ACCEPTED.value
                await self.db.commit()
                return {"success": True, "organization_id": str(invitation.organization_id)}
            else:
                return {"error": "Failed to add user to organization"}

        elif action == "reject":
            invitation.status = InvitationStatus.REJECTED.value
            await self.db.commit()
            return {"success": True}

        return {"error": "Invalid action"}

    async def get_user_invitations(self, user_id: uuid.UUID, user_email: str) -> Dict[str, List[Dict[str, Any]]]:
        """
        Get all invitations for a user, both sent and received.

        Returns a dictionary with two keys:
        - "sent": List of invitations sent by the user
        - "received": List of invitations received by the user
        """
        # Get invitations sent by this user
        sent_result = await self.db.execute(select(Invitation).where(Invitation.inviter_id == user_id))
        sent_invitations = []
        for invitation in sent_result.scalars().all():
            organization = await self.get_organization_by_id(invitation.organization_id)
            organization_name = organization.name if organization else "Unknown Organization"

            sent_invitations.append(
                {
                    "id": str(invitation.id),
                    "organization_id": str(invitation.organization_id),
                    "organization_name": organization_name,
                    "invitee_email": invitation.invitee_email,
                    "role": invitation.role,
                    "status": invitation.status,
                    "token": invitation.token,
                    "expires_at": invitation.expires_at,
                    "created_at": invitation.created_at,
                }
            )

        # Get invitations received by this user
        # Use a different approach to avoid enum comparison issue
        # First get all invitations for this email
        received_result = await self.db.execute(select(Invitation).where(Invitation.invitee_email == user_email))

        received_invitations = []
        for invitation in received_result.scalars().all():
            # Include all invitations regardless of status
            organization = await self.get_organization_by_id(invitation.organization_id)
            organization_name = organization.name if organization else "Unknown Organization"

            # Get inviter info
            inviter_result = await self.db.execute(select(User).where(User.id == invitation.inviter_id))
            inviter = inviter_result.scalars().first()
            inviter_email = inviter.email if inviter else "Unknown User"

            received_invitations.append(
                {
                    "id": str(invitation.id),
                    "organization_id": str(invitation.organization_id),
                    "organization_name": organization_name,
                    "inviter_id": str(invitation.inviter_id),
                    "inviter_email": inviter_email,
                    "role": invitation.role,
                    "status": invitation.status,
                    "token": invitation.token,
                    "expires_at": invitation.expires_at,
                    "created_at": invitation.created_at,
                }
            )

        return {"sent": sent_invitations, "received": received_invitations}

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Type

from pydantic import BaseModel, EmailStr, Field, constr


class OrganizationBase(BaseModel):
    name: str
    description: Optional[str] = None


class OrganizationCreate(OrganizationBase):
    pass

    class Config:
        json_schema_extra = {"example": {"name": "My New Organization", "description": "This is a organization for my team"}}


class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

    class Config:
        json_schema_extra = {"example": {"name": "Updated Organization Name", "description": "Updated organization description"}}


class OrganizationDB(OrganizationBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    is_default: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class OrganizationDisplay(OrganizationBase):
    id: str
    owner_id: str
    is_default: bool
    created_at: datetime

    class Config:
        from_attributes = True

        @staticmethod
        def json_schema_extra(schema: Dict[str, Any], model_class: Type[Any]) -> None:
            schema["properties"]["id"] = {"type": "string", "format": "uuid"}
            schema["properties"]["owner_id"] = {"type": "string", "format": "uuid"}


class OrganizationUser(BaseModel):
    id: str
    email: str
    role: str

    class Config:
        from_attributes = True
        json_schema_extra = {"example": {"id": "123e4567-e89b-12d3-a456-426614174000", "email": "user@example.com", "role": "admin"}}


class OrganizationInvite(BaseModel):
    email: EmailStr
    role: Optional[str] = "member"

    class Config:
        json_schema_extra = {"example": {"email": "friend@example.com", "role": "member"}}


class OrganizationInviteDisplay(BaseModel):
    id: str
    organization_id: str
    invitee_email: str
    role: str
    status: str
    token: str
    expires_at: datetime

    class Config:
        from_attributes = True


class OrganizationInviteAccept(BaseModel):
    token: str

    class Config:
        json_schema_extra = {"example": {"token": "invitation-token"}}


class InvitationDetail(BaseModel):
    id: str
    organization_id: str
    organization_name: str
    role: str
    status: str
    token: str
    expires_at: datetime
    created_at: datetime


class SentInvitationDetail(InvitationDetail):
    invitee_email: str


class ReceivedInvitationDetail(InvitationDetail):
    inviter_id: str
    inviter_email: str


class UserInvitationsResponse(BaseModel):
    sent: List[SentInvitationDetail]
    received: List[ReceivedInvitationDetail]

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, EmailStr, Field, constr


class UserBase(BaseModel):
    email: EmailStr


class UserCreate(UserBase):
    password: constr(min_length=8)

    class Config:
        json_schema_extra = {"example": {"email": "user@example.com", "password": "password123"}}


class UserConfirm(BaseModel):
    email: EmailStr
    confirmation_code: str

    class Config:
        json_schema_extra = {"example": {"email": "user@example.com", "confirmation_code": "123456"}}


class UserLogin(BaseModel):
    email: EmailStr
    password: str

    class Config:
        json_schema_extra = {"example": {"email": "user@example.com", "password": "password123"}}


class UserDB(UserBase):
    id: uuid.UUID
    cognito_id: str
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserDisplay(UserBase):
    id: str

    class Config:
        from_attributes = True


class TokenData(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    expires_in: int
    user: Dict[str, Any]

    class Config:
        json_schema_extra = {
            "example": {
                "access_token": "jwt_token",
                "refresh_token": "refresh_token",
                "token_type": "bearer",
                "expires_in": 1800,
                "user": {
                    "id": "123e4567-e89b-12d3-a456-426614174000",
                    "email": "user@example.com",
                    "organizations": [{"id": "123e4567-e89b-12d3-a456-426614174001", "name": "My Organization", "role": "admin", "is_default": True, "is_owner": True}],
                    "current_organization": "123e4567-e89b-12d3-a456-426614174001",
                },
            }
        }


class TokenRefresh(BaseModel):
    refresh_token: str

    class Config:
        json_schema_extra = {"example": {"refresh_token": "refresh_token"}}


class GoogleCallback(BaseModel):
    code: str

    class Config:
        json_schema_extra = {"example": {"code": "google_auth_code"}}


class UserResendConfirmation(BaseModel):
    email: EmailStr

    class Config:
        json_schema_extra = {"example": {"email": "user@example.com"}}

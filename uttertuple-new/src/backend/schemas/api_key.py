import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class APIKeyBase(BaseModel):
    service_name: str
    key_name: str


class APIKeyCreate(APIKeyBase):
    key: str


class APIKeyUpdate(BaseModel):
    service_name: Optional[str] = None
    key_name: Optional[str] = None
    key: Optional[str] = None


class APIKeyInDBBase(APIKeyBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class APIKey(APIKeyInDBBase):
    """API key information returned to client (without the actual key)"""
    id: str
    user_id: str
    last_used: Optional[datetime] = None
    expires_at: Optional[datetime] = None


class APIKeyWithKey(APIKey):
    """API key with decrypted key, for returning after creation"""
    key: str 
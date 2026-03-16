import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, validator


# LLM Provider Schemas
class UtterLLMProviderBase(BaseModel):
    provider_name: str
    model_name: str


class UtterLLMProviderCreate(UtterLLMProviderBase):
    pass


class UtterLLMProviderUpdate(UtterLLMProviderBase):
    provider_name: Optional[str] = None
    model_name: Optional[str] = None


class UtterLLMProviderInDBBase(UtterLLMProviderBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UtterLLMProvider(UtterLLMProviderInDBBase):
    pass


# LLM User Data Schemas
class LLMUserDataBase(BaseModel):
    provider_name: str
    model_name: Optional[str] = None


class LLMUserDataCreate(LLMUserDataBase):
    api_key: str


class LLMUserDataUpdate(LLMUserDataBase):
    provider_name: Optional[str] = None
    model_name: Optional[str] = None
    api_key: Optional[str] = None


class LLMUserDataInDBBase(LLMUserDataBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LLMUserData(LLMUserDataInDBBase):
    pass


# STT Provider Schemas
class UtterSTTProviderBase(BaseModel):
    provider_name: str
    model_name: str


class UtterSTTProviderCreate(UtterSTTProviderBase):
    pass


class UtterSTTProviderUpdate(UtterSTTProviderBase):
    provider_name: Optional[str] = None
    model_name: Optional[str] = None


class UtterSTTProviderInDBBase(UtterSTTProviderBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UtterSTTProvider(UtterSTTProviderInDBBase):
    pass


# STT User Data Schemas
class STTUserDataBase(BaseModel):
    provider_name: str
    model_name: str


class STTUserDataCreate(STTUserDataBase):
    api_key: str


class STTUserDataUpdate(STTUserDataBase):
    provider_name: Optional[str] = None
    model_name: Optional[str] = None
    api_key: Optional[str] = None


class STTUserDataInDBBase(STTUserDataBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class STTUserData(STTUserDataInDBBase):
    pass


# TTS Provider Schemas
class UtterTTSProviderBase(BaseModel):
    provider_name: str
    model_name: str
    voice: Optional[str] = None


class UtterTTSProviderCreate(UtterTTSProviderBase):
    pass


class UtterTTSProviderUpdate(UtterTTSProviderBase):
    provider_name: Optional[str] = None
    model_name: Optional[str] = None
    voice: Optional[str] = None


class UtterTTSProviderInDBBase(UtterTTSProviderBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UtterTTSProvider(UtterTTSProviderInDBBase):
    pass


# TTS User Data Schemas
class TTSUserDataBase(BaseModel):
    provider_name: str
    model_name: Optional[str] = None
    voice: Optional[str] = None
    base_url: Optional[str] = None
    response_format: Optional[str] = None


class TTSUserDataCreate(TTSUserDataBase):
    api_key: str


class TTSUserDataUpdate(TTSUserDataBase):
    provider_name: Optional[str] = None
    model_name: Optional[str] = None
    voice: Optional[str] = None
    base_url: Optional[str] = None
    response_format: Optional[str] = None
    api_key: Optional[str] = None


class TTSUserDataInDBBase(TTSUserDataBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    base_url: Optional[str] = None
    response_format: Optional[str] = None

    class Config:
        from_attributes = True


class TTSUserData(TTSUserDataInDBBase):
    pass 
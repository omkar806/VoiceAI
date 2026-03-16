import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, validator


class ToolParameterSchema(BaseModel):
    name: str
    description: str
    type: str = "string"


class CollectionFieldSchema(BaseModel):
    name: str
    type: str  # "text", "list", "number", "payment"
    required: bool = False


class TTSConfigSchema(BaseModel):
    provider: str
    base_url: Optional[str] = None
    model: Optional[str] = None
    api_key: str = "not given"
    voice: Optional[str] = None
    response_format: Optional[str] = None


class RAGDatabaseConfigSchema(BaseModel):
    id: uuid.UUID
    collection_name: str
    embedding_model: str
    description: Optional[str] = None
    
    class Config:
        from_attributes = True
        
    # Convert UUID to string for JSON serialization
    @validator('id', pre=False)
    def uuid_to_str(cls, v):
        if v is not None:
            return str(v)
        return v


class AgentToolBase(BaseModel):
    name: str
    description: str
    endpoint_url: Optional[str] = None
    method: Optional[str] = None
    auth_type: Optional[str] = None
    auth_config: Optional[Dict[str, str]] = None
    request_schema: Optional[str] = None
    response_schema: Optional[str] = None
    # allowed_methods: Optional[List[str]] = None
    # parameters: List[ToolParameterSchema] = []
    # response_type: str = "string"
    # confirmation_required: bool = False


class AgentToolCreate(AgentToolBase):
    pass


class AgentToolUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    endpoint_url: Optional[str] = None
    method: Optional[str] = None
    auth_type: Optional[str] = None
    auth_config: Optional[Dict[str, str]] = None
    request_schema: Optional[str] = None
    response_schema: Optional[str] = None
    # allowed_methods: Optional[List[str]] = None


class AgentBase(BaseModel):
    name: str
    instructions: str
    voice_id: Optional[str] = None
    collection_fields: List[CollectionFieldSchema] = Field(default_factory=list)
    llm_provider_id: Optional[uuid.UUID] = None
    llm_model: Optional[str] = None
    llm_config: Optional[Dict[str, Any]] = None
    tts_provider_id: Optional[uuid.UUID] = None
    tts_config: Optional[TTSConfigSchema] = None
    rag_config: Optional[List[RAGDatabaseConfigSchema]] = None


class AgentCreate(AgentBase):
    tools: Optional[List[AgentToolCreate]] = Field(default_factory=list)


class AgentUpdate(BaseModel):
    name: Optional[str] = None
    instructions: Optional[str] = None
    voice_id: Optional[str] = None
    collection_fields: Optional[List[CollectionFieldSchema]] = None
    llm_provider_id: Optional[uuid.UUID] = None
    llm_model: Optional[str] = None
    llm_config: Optional[Dict[str, Any]] = None
    tts_provider_id: Optional[uuid.UUID] = None
    tts_config: Optional[TTSConfigSchema] = None
    rag_config: Optional[List[RAGDatabaseConfigSchema]] = None
    tools: Optional[List[AgentToolCreate]] = None


class AgentToolInDBBase(AgentToolBase):
    id: uuid.UUID
    agent_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AgentTool(AgentToolInDBBase):
    """Agent tool information returned to client"""
    pass


class AgentInDBBase(AgentBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class Agent(AgentInDBBase):
    """Agent information returned to client"""
    tools: Optional[List[AgentTool]] = []


class AgentCompactResponse(BaseModel):
    """Compact agent representation for dropdown lists"""
    id: uuid.UUID
    name: str
    description: Optional[str] = ""

    class Config:
        from_attributes = True
        
    @validator('description', pre=True, always=True)
    def set_description(cls, v, values):
        """Ensure description is never None"""
        return v or ""
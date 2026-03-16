import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from .workflow import WorkflowCompactResponse


class CallAgentBase(BaseModel):
    workflow_id: uuid.UUID
    call_type: str
    phone_numbers: Optional[List[str]] = None


class CallAgentCreate(CallAgentBase):
    pass


class CallAgentUpdate(BaseModel):
    status: Optional[str] = None
    phone_numbers: Optional[List[str]] = None


class CallAgentInDBBase(CallAgentBase):
    id: uuid.UUID
    user_id: uuid.UUID
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CallAgent(CallAgentInDBBase):
    """Call agent information returned to client"""
    workflow: Optional[WorkflowCompactResponse] = None 
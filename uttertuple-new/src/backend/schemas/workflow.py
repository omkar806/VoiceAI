import uuid
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Union

from pydantic import BaseModel, Field, validator

from .agent import AgentCompactResponse


class NodeType(str, Enum):
    AGENT = "agent"
    START = "start"
    END = "end"
    GREETING = "greeting"


class ExecutionStatus(str, Enum):
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELED = "canceled"


class WorkflowNodeBase(BaseModel):
    agent_id: Optional[uuid.UUID] = None
    node_type: NodeType
    position_x: float
    position_y: float
    data: Dict[str, Any] = Field(default_factory=dict)


class WorkflowNodeCreate(WorkflowNodeBase):
    pass


class WorkflowNodeUpdate(BaseModel):
    agent_id: Optional[uuid.UUID] = None
    node_type: Optional[NodeType] = None
    position_x: Optional[float] = None
    position_y: Optional[float] = None
    data: Optional[Dict[str, Any]] = None


class WorkflowEdgeBase(BaseModel):
    source_node_id: uuid.UUID
    target_node_id: uuid.UUID
    condition: Dict[str, Any] = Field(default_factory=dict)
    state: Dict[str, Any] = Field(default_factory=dict)
    label: Optional[str] = None


class WorkflowEdgeCreate(WorkflowEdgeBase):
    pass


class WorkflowEdgeUpdate(BaseModel):
    source_node_id: Optional[uuid.UUID] = None
    target_node_id: Optional[uuid.UUID] = None
    condition: Optional[Dict[str, Any]] = None
    state: Optional[Dict[str, Any]] = None
    label: Optional[str] = None


class WorkflowBase(BaseModel):
    name: str
    description: Optional[str] = None
    initial_greeting: Optional[str] = None
    default_context: Dict[str, Any] = Field(default_factory=dict)
    workflow_json: Optional[Dict[str, Any]] = None


class WorkflowCreate(WorkflowBase):
    pass


class WorkflowUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    initial_agent_id: Optional[uuid.UUID] = None
    initial_greeting: Optional[str] = None
    default_context: Optional[Dict[str, Any]] = None
    workflow_json: Optional[Dict[str, Any]] = None


class WorkflowNodeInDBBase(WorkflowNodeBase):
    id: uuid.UUID
    workflow_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class WorkflowNode(WorkflowNodeInDBBase):
    """Workflow node information returned to client"""
    agent: Optional[AgentCompactResponse] = None


class WorkflowEdgeInDBBase(WorkflowEdgeBase):
    id: uuid.UUID
    workflow_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class WorkflowEdge(WorkflowEdgeInDBBase):
    """Workflow edge information returned to client"""
    pass


class WorkflowInDBBase(WorkflowBase):
    id: uuid.UUID
    user_id: uuid.UUID
    initial_agent_id: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class Workflow(WorkflowInDBBase):
    """Workflow information returned to client"""
    nodes: List[WorkflowNode] = []
    edges: List[WorkflowEdge] = []


class WorkflowCompactResponse(BaseModel):
    """Compact workflow representation for listing"""
    id: uuid.UUID
    name: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class WorkflowExecutionBase(BaseModel):
    workflow_id: uuid.UUID
    status: ExecutionStatus = ExecutionStatus.RUNNING
    runtime_data: Dict[str, Any] = Field(default_factory=dict)
    session_id: Optional[str] = None


class WorkflowExecutionCreate(BaseModel):
    """Used to start a workflow execution"""
    pass


class WorkflowExecutionUpdate(BaseModel):
    status: Optional[ExecutionStatus] = None
    ended_at: Optional[datetime] = None
    error_message: Optional[str] = None
    runtime_data: Optional[Dict[str, Any]] = None


class WorkflowExecutionInDBBase(WorkflowExecutionBase):
    id: uuid.UUID
    started_at: datetime
    ended_at: Optional[datetime] = None
    error_message: Optional[str] = None

    class Config:
        from_attributes = True


class WorkflowExecution(WorkflowExecutionInDBBase):
    """Workflow execution information returned to client"""
    workflow: WorkflowCompactResponse


class WorkflowJsonExport(BaseModel):
    """JSON export format for workflow to use with multi-agent framework"""
    flow_name: str
    agents: List[Dict[str, Any]]
    initial_agent: str
    default_context: Dict[str, Any] = Field(default_factory=dict)
    initial_greeting: Optional[str] = None
    llm_model: str = "gpt-4o-mini"
    llm_options: Dict[str, Any] = Field(default_factory=dict)


class WorkflowExecutionStepBase(BaseModel):
    execution_id: uuid.UUID
    node_id: uuid.UUID
    input_data: Dict[str, Any] = Field(default_factory=dict)
    output_data: Dict[str, Any] = Field(default_factory=dict)
    status: ExecutionStatus = ExecutionStatus.RUNNING
    error_message: Optional[str] = None


class WorkflowExecutionStep(WorkflowExecutionStepBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True 
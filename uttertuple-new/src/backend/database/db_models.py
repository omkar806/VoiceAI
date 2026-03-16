import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, String, JSON, Integer, Boolean, Enum, Text, Float
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import relationship
from database.db_init import Base
from schemas.workflow import NodeType, ExecutionStatus


class Agent(Base):
    __tablename__ = "agents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    organization_id = Column(UUID(as_uuid=True), nullable=False)
    name = Column(String, nullable=False)
    instructions = Column(String, nullable=True)
    voice_id = Column(String, nullable=True)
    collection_fields = Column(JSON, default=list, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # New fields for provider configurations
    llm_provider_id = Column(UUID(as_uuid=True), nullable=True)
    llm_model = Column(String, nullable=True)
    llm_config = Column(JSON, nullable=True)
    tts_provider_id = Column(UUID(as_uuid=True), nullable=True)
    tts_config = Column(JSON, nullable=True)
    rag_config = Column(JSON, nullable=True)

    # Relationships
    tools = relationship("AgentTool", back_populates="agent", cascade="all, delete")
    
    # Property for Pydantic schema compatibility
    @property
    def description(self):
        return self.instructions or ""


class AgentTool(Base):
    __tablename__ = "agent_tools"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    organization_id = Column(UUID(as_uuid=True), nullable=False)
    agent_id = Column(UUID(as_uuid=True), ForeignKey("agents.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    endpoint_url = Column(String, nullable=True)
    method = Column(String, nullable=True)  # GET, POST, DELETE, etc.
    auth_type = Column(String, nullable=True)  # api_key, bearer_token, basic
    auth_config = Column(JSON, nullable=True)  # JSON for auth credentials
    request_schema = Column(String, nullable=True)
    response_schema = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    agent = relationship("Agent", back_populates="tools")



class APIKey(Base):
    __tablename__ = "api_keys"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    organization_id = Column(UUID(as_uuid=True), nullable=False)
    service_name = Column(String, nullable=False)
    key_name = Column(String, nullable=False)
    encrypted_key = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationship
    # user = relationship("User", backref="api_keys") 


class CallAgent(Base):
    __tablename__ = "call_agents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), nullable=False)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    workflow_id = Column(UUID(as_uuid=True), ForeignKey("workflows.id", ondelete="CASCADE"), nullable=False)
    call_type = Column(String, nullable=False)  # "inbound" or "outbound"
    phone_numbers = Column(ARRAY(String), nullable=True)  # Only for outbound calls
    status = Column(String, nullable=False, default="pending")  # pending, active, completed, failed
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    workflow = relationship("Workflow")
    # user = relationship("User")



class LLMUserData(Base):
    """User's LLM provider credentials"""
    __tablename__ = "llm_user_data"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    organization_id = Column(UUID(as_uuid=True), nullable=False)
    provider_name = Column(String, nullable=False)
    model_name = Column(String, nullable=True)
    encrypted_api_key = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationship
    # user = relationship("User", backref="llm_data")





class STTUserData(Base):
    """User's STT provider credentials"""
    __tablename__ = "stt_user_data"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    organization_id = Column(UUID(as_uuid=True), nullable=False)
    provider_name = Column(String, nullable=False)
    model_name = Column(String, nullable=False)
    encrypted_api_key = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationship
    # user = relationship("User", backref="stt_data")




class TTSUserData(Base):
    """User's TTS provider credentials"""
    __tablename__ = "tts_user_data"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    organization_id = Column(UUID(as_uuid=True), nullable=False)
    provider_name = Column(String, nullable=False)
    model_name = Column(String, nullable=True)
    voice = Column(String, nullable=True)
    encrypted_api_key = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    base_url = Column(String, nullable=True)
    response_format = Column(String, nullable=True)

    # Relationship
    # user = relationship("User", backref="tts_data") 
class RAGVectorDB(Base):
    """
    RAG Vector Database Settings model to store Vector DB configurations
    """

    __tablename__ = "rag_vector_dbs"

    id = Column(UUID(as_uuid=True), primary_key=True)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    organization_id = Column(UUID(as_uuid=True), nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    db_type = Column(String, nullable=False)  # Using VectorDBTypeEnum values
    config = Column(JSON, nullable=False)  # Stores credentials and connection details
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    # user = relationship("User", back_populates="rag_vector_dbs")
    rag_file_uploads = relationship("RAGFileUpload", back_populates="vector_db")


class RAGFileUpload(Base):
    """
    RAG File Upload model to store information about uploaded files
    """

    __tablename__ = "rag_file_uploads"

    id = Column(UUID(as_uuid=True), primary_key=True)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    organization_id = Column(UUID(as_uuid=True), nullable=False)
    vector_db_id = Column(UUID(as_uuid=True), ForeignKey("rag_vector_dbs.id"))
    filename = Column(String(255), nullable=False)
    description = Column(String, nullable=True)
    file_type = Column(String(10), nullable=False)  # PDF, DOCX, TXT, CSV
    original_filename = Column(String(255), nullable=False)
    embedding_model = Column(String(50), nullable=False)  # Actual model name (e.g., text-embedding-3-small)
    embedding_provider = Column(String(50), nullable=True)  # Added column for provider (e.g., openai, cohere)
    index_name = Column(String(255), nullable=False)  # Store the index/collection name where vectors are stored
    vector_count = Column(Integer, default=0)  # Number of vectors created
    status = Column(String(50), default="pending")  # pending, processing, completed, error
    error_message = Column(String, nullable=True)
    metadata_rag = Column(JSON, nullable=True)  # Additional metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # user = relationship("User", back_populates="rag_file_uploads")
    vector_db = relationship("RAGVectorDB", back_populates="rag_file_uploads")

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_superuser = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    last_login = Column(DateTime, nullable=True) 
    
    # Add relationships to RAG models
    # rag_vector_dbs = relationship("RAGVectorDB", back_populates="user")
    # rag_file_uploads = relationship("RAGFileUpload", back_populates="user") 

class Workflow(Base):
    __tablename__ = "workflows"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    organization_id = Column(UUID(as_uuid=True), nullable=False)
    name = Column(String, nullable=False)
    initial_greeting = Column(Text, nullable=True)
    default_context = Column(JSONB, nullable=False, default={})
    workflow_json = Column(JSONB, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    nodes = relationship("WorkflowNode", back_populates="workflow", cascade="all, delete")
    edges = relationship("WorkflowEdge", back_populates="workflow", cascade="all, delete")
    executions = relationship("WorkflowExecution", back_populates="workflow", cascade="all, delete")


class WorkflowNode(Base):
    __tablename__ = "workflow_nodes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workflow_id = Column(UUID(as_uuid=True), ForeignKey("workflows.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    organization_id = Column(UUID(as_uuid=True), nullable=False)
    agent_id = Column(UUID(as_uuid=True), ForeignKey("agents.id", ondelete="SET NULL"), nullable=True)
    node_type = Column(Enum(NodeType), nullable=False)
    position_x = Column(Float, nullable=False)
    position_y = Column(Float, nullable=False)
    data = Column(JSONB, nullable=False, default={})
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    workflow = relationship("Workflow", back_populates="nodes")
    agent = relationship("Agent")
    source_edges = relationship("WorkflowEdge", 
                              foreign_keys="WorkflowEdge.source_node_id",
                              back_populates="source_node", 
                              cascade="all, delete")
    target_edges = relationship("WorkflowEdge", 
                              foreign_keys="WorkflowEdge.target_node_id",
                              back_populates="target_node", 
                              cascade="all, delete")
    execution_steps = relationship("WorkflowExecutionStep", back_populates="node", cascade="all, delete")


class WorkflowEdge(Base):
    __tablename__ = "workflow_edges"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workflow_id = Column(UUID(as_uuid=True), ForeignKey("workflows.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    organization_id = Column(UUID(as_uuid=True), nullable=False)
    source_node_id = Column(UUID(as_uuid=True), ForeignKey("workflow_nodes.id", ondelete="CASCADE"), nullable=False)
    target_node_id = Column(UUID(as_uuid=True), ForeignKey("workflow_nodes.id", ondelete="CASCADE"), nullable=False)
    condition = Column(JSONB, nullable=False, default={})
    state = Column(JSONB, nullable=False, default={})
    label = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    workflow = relationship("Workflow", back_populates="edges")
    source_node = relationship("WorkflowNode", foreign_keys=[source_node_id], back_populates="source_edges")
    target_node = relationship("WorkflowNode", foreign_keys=[target_node_id], back_populates="target_edges")


class WorkflowExecution(Base):
    __tablename__ = "workflow_executions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workflow_id = Column(UUID(as_uuid=True), ForeignKey("workflows.id", ondelete="CASCADE"), nullable=False)
    organization_id = Column(UUID(as_uuid=True), nullable=False)
    status = Column(Enum(ExecutionStatus), default=ExecutionStatus.RUNNING, nullable=False)
    runtime_data = Column(JSONB, nullable=False, default={})
    session_id = Column(String, nullable=True)
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    ended_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    workflow = relationship("Workflow", back_populates="executions")
    steps = relationship("WorkflowExecutionStep", back_populates="execution", cascade="all, delete")


class WorkflowExecutionStep(Base):
    __tablename__ = "workflow_execution_steps"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    execution_id = Column(UUID(as_uuid=True), ForeignKey("workflow_executions.id", ondelete="CASCADE"), nullable=False)
    organization_id = Column(UUID(as_uuid=True), nullable=False)
    node_id = Column(UUID(as_uuid=True), ForeignKey("workflow_nodes.id", ondelete="SET NULL"), nullable=True)
    input_data = Column(JSONB, nullable=False, default={})
    output_data = Column(JSONB, nullable=False, default={})
    status = Column(Enum(ExecutionStatus), default=ExecutionStatus.RUNNING, nullable=False)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    execution = relationship("WorkflowExecution", back_populates="steps")
    node = relationship("WorkflowNode", back_populates="execution_steps") 
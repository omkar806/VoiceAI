from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from uuid import UUID
from datetime import datetime
from schemas.rag_schema import VectorDBType
from enum import Enum

class VectorDBBase(BaseModel):
    name: str
    description: str = None
    db_type: VectorDBType
    # created_at: datetime
    config: Dict[str, Any]

class VectorDBCreate(VectorDBBase):
    pass

class VectorDBResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    description: str = None
    db_type: VectorDBType
    created_at: datetime

class FileUploadBase(BaseModel):
    description: str
    vector_db_id: UUID
    embedding_model: str
    index_name: str

class FileUploadCreate(FileUploadBase):
    pass

class FileUploadResponse(FileUploadBase):
    id: UUID
    user_id: UUID
    filename: str
    original_filename: str
    file_type: str
    status: str
    vector_count: Optional[int] = None
    error_message: Optional[str] = None
    
    class Config:
        from_attributes = True

class RAGSearchParams(BaseModel):
    """Parameters for RAG search"""

    query: str
    user_id: str
    workflow_id: str
    organization_id: str
    agent_id: str
    vector_db_config: Dict[str, Any]
    collection_name: str
    top_k: Optional[int] = 5
    vector_db_type: str
    # tts_api_key: str
    embedding_model: str
    embedding_provider: str
    # top_k: Optional[int] = 5
    # vector_db_id: int
    # embedding_model: EmbeddingModel
    # collection_name: str


class RAGSearchResponse(BaseModel):
    """Response model for RAG search"""

    results: List[Dict[str, Any]]

# Add RAG file type enum
class RAGFileType(str, Enum):
    PDF = "pdf"
    DOCX = "docx"
    TXT = "txt"
    CSV = "csv"

# Add status response model
class RAGFileUploadStatus(BaseModel):
    """Status model for RAG file upload"""
    id: UUID
    status: str
    vector_count: Optional[int] = None
    error_message: Optional[str] = None

class RAGFileUploadCreate(BaseModel):
    """Create model for RAG file upload"""
    vector_db_id: UUID
    filename: str
    description: str
    embedding_provider: str
    embedding_model: str
    file_type: RAGFileType

class RAGFileUploadResponse(FileUploadResponse):
    """Response model for RAG file upload with additional fields"""
    embedding_model: str = None  # Actual model name
    embedding_provider: str = None  # Provider name as string
    
    class Config:
        from_attributes = True

# Add collection listing response model
class CollectionListResponse(BaseModel):
    """Response model for collection listing"""
    collections: List[Dict[str, Any]]

# Add collection create request model
class CollectionCreateRequest(BaseModel):
    """Request model for creating a collection"""
    name: str
    dimension: Optional[int] = 1536  # Default to OpenAI embedding dimension

# Add collection create response model
class CollectionCreateResponse(BaseModel):
    """Response model for creating a collection"""
    name: str
    success: bool
    message: str

class CollectionMetadataResponse(BaseModel):
    """Response model for collection metadata"""
    file_count: int
    total_vectors: int
    descriptions: List[str]
    embedding_models: List[str]
    last_updated: Optional[datetime] = None

    class Config:
        from_attributes = True
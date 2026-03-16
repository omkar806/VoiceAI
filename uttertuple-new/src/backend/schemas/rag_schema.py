from pydantic import BaseModel
from typing import Optional, Dict, Any, Union
from enum import Enum
from datetime import datetime


class VectorDBType(str, Enum):
    PINECONE = "pinecone"
    CHROMA = "chroma"
    OPENSEARCH = "opensearch"


# RAG Embedding Models
class EmbeddingModel(str, Enum):
    OPENAI = "openai"
    COHERE = "cohere"
    HF = "huggingface"
    AZURE = "azure_openai"


# RAG File Types
class RAGFileType(str, Enum):
    PDF = "pdf"
    DOCX = "docx"
    TXT = "txt"
    CSV = "csv"


# Vector DB Models
class RAGVectorDBBase(BaseModel):
    """Base model for RAG Vector DB settings"""

    name: str
    description: Optional[str] = None
    db_type: VectorDBType


class PineconeConfig(BaseModel):
    """Config for Pinecone"""

    api_key: str


class ChromaConfig(BaseModel):
    """Config for ChromaDB"""

    host: str
    port: int
    ssl: bool = False
    headers: Optional[Dict[str, str]] = None


class OpenSearchConfig(BaseModel):
    """Config for OpenSearch"""

    host: str
    # port: int
    username: str
    password: str
    verify_certs: bool = True
    use_ssl: bool = True


class RAGVectorDBCreate(RAGVectorDBBase):
    """Request model for creating RAG Vector DB settings"""

    config: Union[PineconeConfig, ChromaConfig, OpenSearchConfig]


class RAGVectorDBResponse(RAGVectorDBBase):
    """Response model for RAG Vector DB settings"""

    id: int
    user_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class RAGVectorDBDelete(BaseModel):
    """Request model for deleting RAG Vector DB settings"""

    id: int


# Vector DB Collection/Index Models
class RAGVectorDBCollectionResponse(BaseModel):
    """Response model for vector DB collections/indexes"""

    name: str
    vector_count: Optional[int] = None
    dimension: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None


# File Upload Models
class RAGFileUploadBase(BaseModel):
    """Base model for RAG file upload"""

    vector_db_id: int
    filename: str
    description: Optional[str] = None
    embedding_provider: Optional[EmbeddingModel] = None
    embedding_model: str


class RAGFileUploadCreate(RAGFileUploadBase):
    """Request model for creating RAG file upload"""

    file_type: RAGFileType
    embedding_provider: EmbeddingModel
    embedding_model: str


class EmbeddingModelSelection(BaseModel):
    """Model for embedding model selection"""

    provider: EmbeddingModel
    model_name: str


class RAGFileUploadStatus(BaseModel):
    """Model for file upload status"""

    id: int
    status: str  # pending, processing, completed, error
    vector_count: int
    total_vectors: Optional[int] = None
    error_message: Optional[str] = None


class RAGFileUploadResponse(RAGFileUploadBase):
    """Response model for RAG file upload"""

    id: int
    user_id: int
    original_filename: str
    file_type: str
    index_name: str
    status: str
    vector_count: int
    error_message: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
        
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

class Collection(BaseModel):
    name: str
    vector_count: Optional[int] = None

class CollectionMetadata(BaseModel):
    file_count: int
    total_vectors: int
    descriptions: List[str]
    embedding_models: List[str]
    last_updated: Optional[str] = None

class RAGFileUploadBase(BaseModel):
    vector_db_id: str
    index_name: str
    file_name: str
    file_type: str
    description: Optional[str] = None
    vector_count: Optional[int] = None
    embedding_model: Optional[str] = None
    status: str = "pending"
    error_message: Optional[str] = None

class RAGFileUploadCreate(RAGFileUploadBase):
    pass

class RAGFileUploadUpdate(RAGFileUploadBase):
    pass

class RAGFileUpload(RAGFileUploadBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True 
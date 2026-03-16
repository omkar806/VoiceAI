"""RAG Controller module for handling RAG API endpoints"""
from typing import List
from uuid import UUID
import os
import asyncio
from sqlalchemy.orm import Session
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    status,
    UploadFile,
    File,
    Form,
    BackgroundTasks
)
from RAG.manager import RAGManager
from schemas.rag_schema import EmbeddingModel
from database.db_models import RAGFileUpload
from auth.manager import AuthManager
from schemas.roles import Roles
from RAG.models.controller_models import VectorDBResponse, FileUploadResponse, RAGFileUploadResponse, RAGFileUploadStatus, RAGSearchResponse, CollectionListResponse, CollectionCreateResponse, CollectionMetadataResponse, RAGFileType, RAGSearchParams, VectorDBCreate, CollectionCreateRequest
import logging
class RAGRestController:
    def __init__(self,db_session: Session,rag_manager: RAGManager,auth_manager: AuthManager):
        self.db = db_session
        self.rag_manager = rag_manager
        self.auth_manager = auth_manager
        self.rag_vector_db_service =rag_manager.rag_vector_db_service
        self.rag_file_upload_service =rag_manager.rag_file_upload_service
        self.logger = logging.getLogger("backend.api.rag")

    def prepare(self,app: APIRouter):
        # Create standalone endpoints
        @app.get("/rag/vector-dbs", response_model=List[VectorDBResponse], tags=["rag"]) 
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        async def get_vector_dbs(
            request: Request,
        ):
            """Get all vector databases for the current user"""
            user = request.state.user
            try:
                user = request.state.user
                vector_dbs = await self.rag_vector_db_service.get_all_vector_dbs(user_id=user["user_id"],organization_id=user["current_organization"])
                self.logger.info(f"vector_dbs endpoint: {vector_dbs}")
                return vector_dbs
            except Exception as e:
                self.logger.error(f"Failed to get vector databases: {str(e)}")
                raise HTTPException(status_code=500, detail=str(e))

        @app.get("/rag/vector-dbs/{vector_db_id}", response_model=VectorDBResponse, tags=["rag"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        async def get_vector_db(
            request: Request,
            vector_db_id: UUID,
        ):
            """Get a vector database by ID"""
            user = request.state.user
            try:
                user = request.state.user
                vector_db = await self.rag_vector_db_service.get_vector_db(vector_db_id=vector_db_id, user_id=user["user_id"],organization_id=user["current_organization"])
                if not vector_db:
                    raise HTTPException(status_code=404, detail="Vector database not found")
                return vector_db
            except HTTPException:
                raise
            except Exception as e:
                self.logger.error(f"Failed to get vector database: {str(e)}")
                raise HTTPException(status_code=500, detail=str(e))

        @app.post("/rag/vector-dbs", response_model=VectorDBResponse, status_code=status.HTTP_201_CREATED, tags=["rag"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        async def create_vector_db(
            request: Request,
            vector_db: VectorDBCreate,
        ):
            """Create a new vector database connection"""
            try:
                user = request.state.user
                # Create vector DB
                created_db = await self.rag_vector_db_service.connect_vector_db(
                    user_id=user["user_id"],
                    organization_id=user["current_organization"],
                    name=vector_db.name,
                    description=vector_db.description,
                    db_type=vector_db.db_type,
                    config=vector_db.config
                )
                self.logger.info(f"created_db: {created_db}")
                return created_db
            except Exception as e:
                self.logger.error(f"Failed to create vector database: {str(e)}")
                raise HTTPException(status_code=500, detail=str(e))

        @app.delete("/rag/vector-dbs/{vector_db_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["rag"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        async def delete_vector_db(
            request: Request,
            vector_db_id: UUID,
        ):
            """Delete a vector database"""
            try:
                user = request.state.user
                result = await self.rag_vector_db_service.disconnect_vector_db(vector_db_id=vector_db_id, user_id=user["user_id"],organization_id=user["current_organization"])
                if not result:
                    raise HTTPException(status_code=404, detail="Vector database not found")
                return None
            except HTTPException:
                raise
            except Exception as e:
                self.logger.error(f"Failed to delete vector database: {str(e)}")
                raise HTTPException(status_code=500, detail=str(e))

        # File upload endpoints
        @app.get("/rag/vector-dbs/{vector_db_id}/files", response_model=List[FileUploadResponse], tags=["rag"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        async def get_files_by_vector_db(
            request: Request,
            vector_db_id: UUID,
        ):
            """Get all files for a vector database"""
            try:
                user = request.state.user
                files = await self.rag_file_upload_service.get_file_uploads_by_vector_db(vector_db_id=vector_db_id, user_id=user["user_id"],organization_id=user["current_organization"])
                
                # Ensure description is always a string to satisfy validation
                for file in files:
                    if file.description is None:
                        file.description = ""
                        
                return files
            except Exception as e:
                self.logger.error(f"Failed to get files: {str(e)}")
                raise HTTPException(status_code=500, detail=str(e))

        @app.get("/rag/files/{file_id}", response_model=FileUploadResponse, tags=["rag"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        async def get_file(
            request: Request,
            file_id: UUID,
        ):
            """Get a file by ID"""
            try:
                user = request.state.user
                file = await self.rag_file_upload_service.get_file_upload(file_id=file_id, user_id=user["user_id"],organization_id=user["current_organization"])
                if not file:
                    raise HTTPException(status_code=404, detail="File not found")
                return file
            except HTTPException:
                raise
            except Exception as e:
                self.logger.error(f"Failed to get file: {str(e)}")
                raise HTTPException(status_code=500, detail=str(e))

        @app.delete("/rag/files/{file_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["rag"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        async def delete_file(
            request: Request,
            file_id: UUID,
        ):
            """Delete a file"""
            try:
                user = request.state.user
                result = await self.rag_file_upload_service.delete_file_upload(file_id=file_id, user_id=user["user_id"],organization_id=user["current_organization"])
                if not result:
                    raise HTTPException(status_code=404, detail="File not found")
                return None
            except HTTPException:
                raise
            except Exception as e:
                self.logger.error(f"Failed to delete file: {str(e)}")
                raise HTTPException(status_code=500, detail=str(e))

        # Replace the file upload endpoint to include processing and storing in vector database
        @app.post("/rag/vector-dbs/{vector_db_id}/files", response_model=RAGFileUploadResponse, status_code=status.HTTP_202_ACCEPTED, tags=["rag"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        async def upload_file(
            request: Request,
            vector_db_id: UUID,
            background_tasks: BackgroundTasks = BackgroundTasks(),
            file: UploadFile = File(...),
            filename: str = Form(...),
            description: str = Form(...),
            embedding_provider: EmbeddingModel = Form(...),
            embedding_model: str = Form(...),
            index_name: str = Form(...),  # Add index_name parameter
        ) -> RAGFileUploadResponse:
            """Upload a file to a vector database and process it for RAG"""
            user = request.state.user
            self.logger.info(f"File upload endpoint hit for vector_db_id: {vector_db_id} by user: {user['user_id']}")
            self.logger.info(f"Received file: {file.filename}, custom filename: {filename}, embedding_provider: {embedding_provider}, embedding_model: {embedding_model}, index_name: {index_name}")
            try:
                # Determine file type from extension
                file_extension = file.filename.split(".")[-1].lower()
                file_type = None

                if file_extension == "pdf":
                    file_type = RAGFileType.PDF
                elif file_extension in ["doc", "docx"]:
                    file_type = RAGFileType.DOCX
                elif file_extension == "txt":
                    file_type = RAGFileType.TXT
                elif file_extension == "csv":
                    file_type = RAGFileType.CSV
                else:
                    self.logger.error(f"Unsupported file type: {file_extension}")
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, 
                                    detail=f"Unsupported file type: {file_extension}. Supported types are: pdf, docx, txt, csv")
                
                self.logger.info(f"File type determined: {file_type}")

                # Create uploads directory if it doesn't exist
                os.makedirs("uploads", exist_ok=True)
                self.logger.info(f"Uploads directory verified")
                
                # Save file to disk
                file_content = await file.read()
                file_path = f"uploads/{user['user_id']}_{vector_db_id}_{file.filename}"
                with open(file_path, "wb") as f:
                    f.write(file_content)
                self.logger.info(f"File saved to disk at: {file_path}")
                    
                # Check if vector DB exists
                self.logger.info(f"Verifying vector DB with id: {vector_db_id}")
                vector_db = await self.rag_vector_db_service.get_vector_db(vector_db_id=vector_db_id, user_id=user["user_id"],organization_id=user["current_organization"])
                if not vector_db:
                    self.logger.error(f"Vector database not found with id: {vector_db_id}")
                    raise HTTPException(status_code=404, detail="Vector database not found")
                self.logger.info(f"Vector DB found: {vector_db.name}")
                
                # Create file upload record with initial pending status
                self.logger.info(f"Creating file upload record in database")
                file_upload = await self.rag_file_upload_service.create_file_upload(
                    user_id=user["user_id"],
                    organization_id=user["current_organization"],
                    vector_db_id=vector_db_id,
                    filename=file.filename,
                    description=description,
                    file_type=str(file_type.value),
                    original_filename=file.filename,
                    embedding_model=embedding_model,  # Store the actual model name
                    embedding_provider=str(embedding_provider.value),  # Store the provider name as string, not enum
                    index_name=index_name  # Use the provided index_name
                )
                
                self.logger.info(f"File upload record created: ID={file_upload.id}, Status={file_upload.status}")
                
                # try:
                    # Update status to processing
                await self.rag_file_upload_service.update_file_upload_status(
                        file_id=file_upload.id,
                        user_id=user["user_id"],
                        organization_id=user["current_organization"],
                        status="processing"
                    )
                    
                    # Initialize vector DB provider using the vector_db config
                vector_db_provider = self.rag_manager.get_vector_db_provider(
                        db_type=vector_db.db_type,
                        config=vector_db.config
                    )
                    
                    # Process the file upload using the RAG manager
                provider_api_key = None
                provider_endpoint = None
                    
                if embedding_provider == EmbeddingModel.OPENAI:
                    provider_api_key = os.environ.get("OPENAI_API_KEY")
                elif embedding_provider == EmbeddingModel.COHERE:
                    provider_api_key = os.environ.get("COHERE_API_KEY")
                elif embedding_provider == EmbeddingModel.HF:
                    provider_api_key = os.environ.get("HUGGINGFACE_API_KEY")
                elif embedding_provider == EmbeddingModel.AZURE:
                    provider_api_key = os.environ.get("AZURE_OPENAI_API_KEY")
                    provider_endpoint = os.environ.get("AZURE_OPENAI_ENDPOINT")
                
                background_tasks.add_task(
                    _process_file_upload,
                    file_service=self.rag_file_upload_service,
                    user=user,
                    file_id=file_upload.id,
                    user_id=user["user_id"],
                    organization_id=user["current_organization"],
                    file_path=file_path,
                    file_type=str(file_type.value),
                    vector_db_provider=vector_db_provider,
                    collection_name=index_name,
                    embedding_model=embedding_model,
                    embedding_provider=embedding_provider,
                    provider_api_key=provider_api_key,
                    provider_endpoint=provider_endpoint
                )
                self.logger.info(f"Gave the file for background task")
                return FileUploadResponse(
                    description=description,
                    vector_db_id=vector_db_id,
                    embedding_model=embedding_model,
                    index_name=index_name,
                    id=file_upload.id,
                    user_id=user["user_id"],
                    filename=file.filename,
                    original_filename=file.filename,
                    file_type=str(file_type.value),
                    status="processing",
                    vector_count=0,
                    error_message=None
                )
            except ValueError as e:
                self.logger.error(f"Value error during file upload: {str(e)}")
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
            except Exception as e:
                self.logger.error(f"Failed to upload file: {str(e)}", exc_info=True)
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to upload file: {str(e)}")

        def _process_file_upload(user,file_id:str , user_id:str, organization_id:str, file_path:str, file_type:str, vector_db_provider:str, collection_name:str, embedding_model:str, embedding_provider:str, provider_api_key:str, provider_endpoint:str):
            try:
                self.logger.info(f"Processing file upload in background task")
                result = self.rag_manager.process_file_upload(
                    user_id=user_id,
                    file_id=file_id,
                    file_path=file_path,
                    file_type=file_type,
                    vector_db_provider=vector_db_provider,
                    collection_name=collection_name,
                    embedding_selection=embedding_model,
                    embedding_provider=embedding_provider,
                    api_key=provider_api_key,
                    endpoint=provider_endpoint
                )
                self.logger.info(f"File upload processed in background task")
                asyncio.run(self.rag_file_upload_service.update_file_upload_status(
                    file_id=file_id,
                    user_id=user_id,
                    organization_id=organization_id,
                    status="completed"
                ))
                self.logger.info(f"File upload status updated to completed in background task")
                file_upload = asyncio.run(self.rag_file_upload_service.get_file_upload(file_id=file_id, user_id=user_id,organization_id=organization_id))
                os.remove(file_path)
            except Exception as e:
                    # Update file upload status to error if processing fails
                self.logger.error(f"Error processing file upload: {str(e)}")
                asyncio.run(self.rag_file_upload_service.update_file_upload_status(
                        file_id=file_upload.id,
                        user_id=user["user_id"],
                        organization_id=user["current_organization"],
                        status="failed",
                        error_message=str(e),
                        vector_count=0
                ))
                file_upload = asyncio.run(self.rag_file_upload_service.get_file_upload(file_id=file_upload.id, user_id=user["user_id"],organization_id=user["current_organization"]))
            file_upload.embedding_model = embedding_model
            file_upload.embedding_provider = str(embedding_provider.value)  # Add embedding_provider to response
            self.logger.info(f"File upload response: {file_upload}")
            return file_upload

        @app.get("/rag/files/{file_id}/status", response_model=RAGFileUploadStatus, status_code=status.HTTP_200_OK, tags=["rag"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        async def get_file_upload_status(
            request: Request,
            file_id: UUID,
        ) -> RAGFileUploadStatus:
            """Get the status of a file upload"""
            self.logger.info(f"Getting file upload status for file_id: {file_id}")
            try:
                user = request.state.user
                self.logger.info(f"User: {user}")
                file_upload = await self.rag_file_upload_service.get_file_upload(file_id=file_id, user_id=user["user_id"],organization_id=user["current_organization"])
                self.logger.info(f"File upload: {file_upload}")
                if not file_upload:
                    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, 
                                    detail=f"File upload with ID {file_id} not found")
                                    
                return RAGFileUploadStatus(
                    id=file_upload.id,
                    status=file_upload.status,
                    vector_count=file_upload.vector_count,
                    error_message=file_upload.error_message
                )
            except HTTPException:
                raise
            except Exception as e:
                self.logger.error(f"Failed to get file upload status: {str(e)}")
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                                detail=f"Failed to get file upload status: {str(e)}")

        # Add a standalone search endpoint
        @app.post("/rag/search", response_model=RAGSearchResponse, status_code=status.HTTP_200_OK, tags=["rag"])
        async def search_vector_db(
            search_params: RAGSearchParams,
        ) -> RAGSearchResponse:
            """Search the RAG vector database"""
            self.logger.info(f"Search params: {search_params}")
            try:
                # Get vector DB details
                # Get embedding for query
                if search_params.embedding_model == "text-embedding-3-small" or search_params.embedding_model == "text-embedding-3-large" or search_params.embedding_model == "text-embedding-ada-002":
                    embedding_provider = self.rag_manager.get_embedding_provider(
                        embedding_provider=search_params.embedding_provider, 
                        embedding_model=search_params.embedding_model,
                        api_key=os.getenv("OPENAI_API_KEY")
                    )

                query_embedding = embedding_provider.get_embeddings([search_params.query])[0]

                # Get vector DB provider
                vector_db_provider = self.rag_manager.get_vector_db_provider(db_type=search_params.vector_db_type, config=search_params.vector_db_config)

                # Search vector DB
                results = vector_db_provider.query(collection_name=search_params.collection_name, query_embedding=query_embedding, top_k=search_params.top_k)
                self.logger.info(f"Results: {results}")
                return RAGSearchResponse(results=results)
            except Exception as e:
                self.logger.error(f"Failed to search RAG: {str(e)}")
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to search RAG: {str(e)}")

        # Add endpoints for listing and creating collections
        @app.get("/rag/vector-dbs/{vector_db_id}/collections", response_model=CollectionListResponse, tags=["rag"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        async def list_collections(
            request: Request,
            vector_db_id: UUID,
        ):
            """List collections for a vector database"""
            try:
                user = request.state.user
                # Get vector DB
                vector_db = await self.rag_vector_db_service.get_vector_db(vector_db_id=vector_db_id, user_id=user["user_id"],organization_id=user["current_organization"])
                
                if not vector_db:
                    raise HTTPException(status_code=404, detail="Vector database not found")
                    
                # Initialize vector DB provider
                vector_db_provider = self.rag_manager.get_vector_db_provider(
                    db_type=vector_db.db_type,
                    config=vector_db.config
                )
                
                # List collections
                collections = vector_db_provider.list_collections()
                
                # Convert collection objects to dictionaries
                collection_dicts = []
                for collection in collections:
                    collection_dict = {
                        "name": collection.name,
                        "vector_count": collection.vector_count,
                        "dimension": collection.dimension if hasattr(collection, "dimension") else None,
                        "metadata": collection.metadata or {}
                    }
                    collection_dicts.append(collection_dict)
                
                return {"collections": collection_dicts}
            except Exception as e:
                self.logger.error(f"Failed to list collections: {str(e)}")
                raise HTTPException(status_code=500, detail=str(e))

        @app.post("/rag/vector-dbs/{vector_db_id}/collections", response_model=CollectionCreateResponse, tags=["rag"])
        async def create_collection(
            request: Request,
            vector_db_id: UUID,
            collection: CollectionCreateRequest,
        ):
            """Create a collection in a vector database"""
            try:
                # Get vector DB
                user = request.state.user
                vector_db = await self.rag_vector_db_service.get_vector_db(vector_db_id=vector_db_id, user_id=user["user_id"],organization_id=user["current_organization"])
                
                if not vector_db:
                    raise HTTPException(status_code=404, detail="Vector database not found")
                    
                # Initialize vector DB provider
                vector_db_provider = self.rag_manager.get_vector_db_provider(
                    db_type=vector_db.db_type,
                    config=vector_db.config
                )
                
                # Create collection
                success = vector_db_provider.create_collection(
                    name=collection.name,
                    dimension=collection.dimension
                )
                
                if success:
                    return {
                        "name": collection.name,
                        "success": True,
                        "message": f"Collection '{collection.name}' created successfully"
                    }
                else:
                    return {
                        "name": collection.name,
                        "success": False,
                        "message": f"Failed to create collection '{collection.name}'"
                    }
            except Exception as e:
                self.logger.error(f"Failed to create collection: {str(e)}")
                raise HTTPException(status_code=500, detail=str(e))

        @app.get("/rag/vector-dbs/{vector_db_id}/collections/{collection_name}/metadata", response_model=CollectionMetadataResponse)
        async def get_collection_metadata(
            request: Request,
            vector_db_id: UUID,
            collection_name: str,
        ):
            """Get metadata for a specific collection including file information"""
            try:
                user = request.state.user
                files = self.db.query(RAGFileUpload).filter(
                    RAGFileUpload.vector_db_id == vector_db_id,
                    RAGFileUpload.index_name == collection_name,
                    RAGFileUpload.user_id == user["user_id"],
                    RAGFileUpload.organization_id == user["current_organization"],
                    RAGFileUpload.status == 'completed'
                ).all()
                
                if not files:
                    return CollectionMetadataResponse(
                        file_count=0,
                        total_vectors=0,
                        descriptions=[],
                        embedding_models=[],
                        last_updated=None
                    )
                
                return CollectionMetadataResponse(
                    file_count=len(files),
                    total_vectors=sum(f.vector_count or 0 for f in files),
                    descriptions=[f.description for f in files if f.description],
                    embedding_models=list(set(f.embedding_model for f in files if f.embedding_model)),
                    last_updated=max(f.updated_at for f in files) if files else None
                )
            except Exception as e:
                self.logger.error(f"Error getting collection metadata: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Error getting collection metadata: {str(e)}"
                )
from database.db_models import RAGVectorDB, RAGFileUpload
import logging
# from app.db.base import get_db
from sqlalchemy.orm import Session
from typing import Dict, Any, List
from datetime import datetime, timezone
import uuid
from security.manager import SecurityManager
logger = logging.getLogger(__name__)


class RAGVectorDBModelService:
    """
    Service class handling database operations for RAG Vector DB model
    """

    def __init__(self, security_manager: SecurityManager, db_session: Session) -> None:
        self.security_manager = security_manager
        self.db = db_session

    async def connect_vector_db(self, user_id: int,organization_id:int, name: str, description: str, db_type: str, config: Dict[str, Any]) -> RAGVectorDB:
        """Create a new vector database connection"""
        try:
            # Encrypt sensitive information in config
            encrypted_config = {}
            for key, value in config.items():
                if key in ["api_key", "password", "secret_key"]:
                    encrypted_config[key] = self.security_manager.encrypt_api_key(value)
                else:
                    encrypted_config[key] = value

            db_vector_db = RAGVectorDB(user_id=user_id, organization_id=organization_id, id=uuid.uuid4(), name=name, description=description, db_type=db_type, config=encrypted_config)
            self.db.add(db_vector_db)
            self.db.commit()
            self.db.refresh(db_vector_db)
            return db_vector_db
        except Exception as e:
            logger.error(f"Failed to create vector DB: {str(e)}")
            raise Exception(f"Could not create vector DB connection due to {str(e)}")

    async def get_vector_db(self, vector_db_id: int, user_id: int,organization_id:int) -> RAGVectorDB:
        """Get vector DB by ID"""
        try:
            db_vector_db = self.db.query(RAGVectorDB).filter(RAGVectorDB.id == vector_db_id, RAGVectorDB.user_id == user_id,RAGVectorDB.organization_id == organization_id).first()

            # Decrypt sensitive information
            if db_vector_db:
                config = db_vector_db.config.copy()
                for key, value in config.items():
                    if key in ["api_key", "password", "secret_key"]:
                        try:
                            config[key] = self.security_manager.decrypt_api_key(value)
                        except Exception:
                            # If decryption fails, keep encrypted value
                            pass
                db_vector_db.config = config
            logger.info(f"Vector DB: {db_vector_db}")
            return db_vector_db
        except Exception as e:
            logger.error(f"Failed to get vector DB: {str(e)}")
            raise Exception(f"Could not retrieve vector DB due to {str(e)}")

    async def get_all_vector_dbs(self, user_id: int,organization_id:int) -> List[RAGVectorDB]:
        """Get all vector DBs for user"""
        try:
            db_vector_dbs = self.db.query(RAGVectorDB).filter(RAGVectorDB.user_id == user_id,RAGVectorDB.organization_id == organization_id).all()
            
            # Check if there are any vector DBs before accessing the first element
            if db_vector_dbs and len(db_vector_dbs) > 0:
                logger.info(f"db_vector_dbs: {db_vector_dbs[0].name}")
            else:
                logger.info("No vector DBs found for user")
                return []
                
            # Mask sensitive information rather than decrypting it for listing
            for vector_db in db_vector_dbs:
                config = vector_db.config.copy()
                for key in config:
                    if key in ["api_key", "password", "secret_key"]:
                        config[key] = "********"
                vector_db.config = config

            return db_vector_dbs
        except Exception as e:
            logger.error(f"Failed to get all vector DBs: {str(e)}")
            raise Exception(f"Could not retrieve vector DBs due to {str(e)}")

    async def disconnect_vector_db(self, vector_db_id: int, user_id: int,organization_id:int) -> bool:
        """Delete vector DB"""
        try:
            result = self.db.query(RAGVectorDB).filter(RAGVectorDB.id == vector_db_id, RAGVectorDB.user_id == user_id,RAGVectorDB.organization_id == organization_id).delete()
            self.db.commit()
            return result > 0
        except Exception as e:
            logger.error(f"Failed to delete vector DB: {str(e)}")
            raise Exception(f"Could not delete vector DB due to {str(e)}")


class RAGFileUploadModelService:
    """
    Service class handling database operations for RAG File Upload model
    """

    def __init__(self, security_manager: SecurityManager, db_session: Session) -> None:
        self.security_manager = security_manager
        self.db = db_session

    async def create_file_upload(self, user_id: int,organization_id:int, vector_db_id: int, filename: str, description: str, file_type: str, original_filename: str, embedding_model: str, embedding_provider: str, index_name: str) -> RAGFileUpload:
        """Create a new file upload record"""
        try:
            db_file_upload = RAGFileUpload(
                user_id=user_id, 
                organization_id=organization_id,
                id=uuid.uuid4(), 
                vector_db_id=vector_db_id, 
                filename=filename, 
                description=description, 
                file_type=file_type, 
                original_filename=original_filename, 
                embedding_model=embedding_model,
                embedding_provider=embedding_provider,
                index_name=index_name, 
                status="pending"
            )
            self.db.add(db_file_upload)
            self.db.commit()
            self.db.refresh(db_file_upload)
            logger.info(f"File upload record created: ID={db_file_upload.id}, Status={db_file_upload.status}")
            return db_file_upload
        except Exception as e:
            logger.error(f"Failed to create file upload: {str(e)}")
            raise Exception(f"Could not create file upload record due to {str(e)}")

    async def update_file_upload_status(self, file_id: int, user_id: int,organization_id:int, status: str, vector_count: int = None, error_message: str = None) -> RAGFileUpload:
        """Update file upload status"""
        try:
            db_file_upload = self.db.query(RAGFileUpload).filter(RAGFileUpload.id == file_id, RAGFileUpload.user_id == user_id,RAGFileUpload.organization_id == organization_id).first()

            if db_file_upload:
                db_file_upload.status = status
                if vector_count is not None:
                    db_file_upload.vector_count = vector_count
                if error_message is not None:
                    db_file_upload.error_message = error_message
                db_file_upload.updated_at = datetime.now(timezone.utc)

                self.db.commit()
                self.db.refresh(db_file_upload)

            return db_file_upload
        except Exception as e:
            logger.error(f"Failed to update file upload: {str(e)}")
            raise Exception(f"Could not update file upload status due to {str(e)}")

    async def get_file_upload(self, file_id: int, user_id: int,organization_id:int) -> RAGFileUpload:
        """Get file upload by ID"""
        try:
            return self.db.query(RAGFileUpload).filter(RAGFileUpload.id == file_id, RAGFileUpload.user_id == user_id,RAGFileUpload.organization_id == organization_id).first()
        except Exception as e:
            logger.error(f"Failed to get file upload: {str(e)}")
            raise Exception(f"Could not retrieve file upload due to {str(e)}")

    async def get_file_uploads_by_vector_db(self, vector_db_id: int, user_id: int,organization_id:int) -> List[RAGFileUpload]:
        """Get all file uploads for a vector DB"""
        try:
            return self.db.query(RAGFileUpload).filter(RAGFileUpload.vector_db_id == vector_db_id, RAGFileUpload.user_id == user_id,RAGFileUpload.organization_id == organization_id).all()
        except Exception as e:
            logger.error(f"Failed to get file uploads: {str(e)}")
            raise Exception(f"Could not retrieve file uploads due to {str(e)}")

    async def delete_file_upload(self, file_id: int, user_id: int,organization_id:int) -> bool:
        """Delete file upload"""
        try:
            result = self.db.query(RAGFileUpload).filter(RAGFileUpload.id == file_id, RAGFileUpload.user_id == user_id,RAGFileUpload.organization_id == organization_id).delete()
            self.db.commit()
            return result > 0
        except Exception as e:
            logger.error(f"Failed to delete file upload: {str(e)}")
            raise Exception(f"Could not delete file upload due to {str(e)}")
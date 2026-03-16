from typing import List, Optional
from sqlalchemy.orm import Session
from database.db_models import APIKey
from schemas.api_key import APIKeyCreate, APIKeyUpdate
from security.manager import SecurityManager
from common.config import Configuration
import logging

logger = logging.getLogger(__name__)

class SettingsManager:
    def __init__(self, config: Configuration,db_session: Session, security_manager: SecurityManager):
        self.config = config.configuration()
        self.security_manager = security_manager
        self.db  = db_session

    def get_by_id(self, api_key_id: str) -> Optional[APIKey]:
        """Get an API key by ID"""
        logger.info(f"Getting API key by ID: {api_key_id}")
        return self.db.query(APIKey).filter(APIKey.id == api_key_id).first()


    def get_by_user_id(self, user_id: str) -> List[APIKey]:
        """Get all API keys for a user"""
        return self.db.query(APIKey).filter(APIKey.user_id == user_id).all()


    def get_by_service_name(self, user_id: str, service_name: str) -> List[APIKey]:
        """Get all API keys for a user for a specific service"""
        return self.db.query(APIKey).filter(
            APIKey.user_id == user_id,
            APIKey.service_name == service_name
        ).all()


    def create(self,user_id: str, obj_in: APIKeyCreate) -> APIKey:
        """Create a new API key"""
        encrypted_key = self.security_manager.encrypt_api_key(obj_in.key)
        
        db_obj = APIKey(
            user_id=user_id,
            service_name=obj_in.service_name,
            key_name=obj_in.key_name,
            encrypted_key=encrypted_key,
        )
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj


    def update(self,db_obj: APIKey, obj_in: APIKeyUpdate) -> APIKey:
        """Update an API key"""
        update_data = obj_in.model_dump(exclude_unset=True)
        
        if "key" in update_data and update_data["key"]:
            update_data["encrypted_key"] = self.security_manager.encrypt_api_key(update_data.pop("key"))
        
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj


    def delete(self,api_key_id: str) -> None:
        """Delete an API key"""
        db_obj = self.get_by_id(api_key_id)
        if db_obj:
            self.db.delete(db_obj)
            self.db.commit()


    def get_decrypted_key(self,api_key: APIKey) -> str:
        """Get the decrypted API key"""
        return self.security_manager.decrypt_api_key(api_key.encrypted_key) 
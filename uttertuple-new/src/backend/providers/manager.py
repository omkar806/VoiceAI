from typing import List, Optional, Union, Dict, Any
from uuid import UUID

from sqlalchemy.orm import Session

from database.db_models import (
    LLMUserData,
    STTUserData,
    TTSUserData
)
from schemas.provider import (
    LLMUserDataCreate, LLMUserDataUpdate,
    STTUserDataCreate, STTUserDataUpdate,
    TTSUserDataCreate, TTSUserDataUpdate
)
from security.manager import SecurityManager


class ProviderManager:
    def __init__(self, db_session: Session, security_manager: SecurityManager):
        self.db = db_session
        self.security_manager = security_manager
        
    # LLM User Data Functions
    def get_user_llm_data(self,user_id: UUID, skip: int = 0, limit: int = 100) -> List[LLMUserData]:
        """Get all LLM user data for a user"""
        print(f"Getting LLM user data for user {user_id}")
        return self.db.query(LLMUserData).filter(LLMUserData.user_id == user_id).offset(skip).limit(limit).all()


    def get_user_llm_data_by_id(self,user_id: UUID, data_id: UUID) -> Optional[LLMUserData]:
        """Get LLM user data by ID"""
        return self.db.query(LLMUserData).filter(
            LLMUserData.user_id == user_id,
            LLMUserData.id == data_id
        ).first()


    def create_user_llm_data(self,user_id: UUID, organization_id: UUID, data_in: LLMUserDataCreate) -> LLMUserData:
        """Create LLM user data"""
        data = data_in.model_dump()
        api_key = data.pop('api_key')
        encrypted_key = self.security_manager.encrypt_api_key(api_key)
        
        db_obj = LLMUserData(
            user_id=user_id,
            organization_id=organization_id,
            encrypted_api_key=encrypted_key,
            **data
        )
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj


    def update_user_llm_data(
        self, db_obj: LLMUserData, obj_in: LLMUserDataUpdate
    ) -> LLMUserData:
        """Update LLM user data"""
        update_data = obj_in.model_dump(exclude_unset=True)
        
        if 'api_key' in update_data:
            api_key = update_data.pop('api_key')
            if api_key:
                update_data['encrypted_api_key'] = self.security_manager.encrypt_api_key(api_key)
        
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj


    def delete_user_llm_data(self, db_obj: LLMUserData) -> None:
        """Delete LLM user data"""
        self.db.delete(db_obj)
        self.db.commit()


    def get_decrypted_llm_api_key(self,db_obj: LLMUserData) -> str:
        """Get the decrypted LLM API key"""
        return self.security_manager.decrypt_api_key(db_obj.encrypted_api_key)

    # STT User Data Functions
    def get_user_stt_data(self,user_id: UUID, skip: int = 0, limit: int = 100) -> List[STTUserData]:
        """Get all STT user data for a user"""
        return self.db.query(STTUserData).filter(STTUserData.user_id == user_id).offset(skip).limit(limit).all()


    def get_user_stt_data_by_id(self,user_id: UUID, data_id: UUID) -> Optional[STTUserData]:
        """Get STT user data by ID"""
        return self.db.query(STTUserData).filter(
            STTUserData.user_id == user_id,
            STTUserData.id == data_id
        ).first()


    def create_user_stt_data(self,user_id: UUID, data_in: STTUserDataCreate) -> STTUserData:
        """Create STT user data"""
        data = data_in.model_dump()
        api_key = data.pop('api_key')
        encrypted_key = self.security_manager.encrypt_api_key(api_key)
        
        db_obj = STTUserData(
            user_id=user_id,
            encrypted_api_key=encrypted_key,
            **data
        )
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj


    def update_user_stt_data(
        self, db_obj: STTUserData, obj_in: STTUserDataUpdate
    ) -> STTUserData:
        """Update STT user data"""
        update_data = obj_in.model_dump(exclude_unset=True)
        
        if 'api_key' in update_data:
            api_key = update_data.pop('api_key')
            if api_key:
                update_data['encrypted_api_key'] = self.security_manager.encrypt_api_key(api_key)
        
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj


    def delete_user_stt_data(self, db_obj: STTUserData) -> None:
        """Delete STT user data"""
        self.db.delete(db_obj)
        self.db.commit()


    def get_decrypted_stt_api_key(self,db_obj: STTUserData) -> str:
        """Get the decrypted STT API key"""
        return self.security_manager.decrypt_api_key(db_obj.encrypted_api_key)



    # TTS User Data Functions
    def get_user_tts_data(self,user_id: UUID,organization_id:UUID, skip: int = 0, limit: int = 100) -> List[TTSUserData]:
        """Get all TTS user data for a user"""
        return self.db.query(TTSUserData).filter(TTSUserData.user_id == user_id,TTSUserData.organization_id == organization_id).offset(skip).limit(limit).all()


    def get_user_tts_data_by_id(self,user_id: UUID, data_id: UUID) -> Optional[TTSUserData]:
        """Get TTS user data by ID"""
        return self.db.query(TTSUserData).filter(
            TTSUserData.user_id == user_id,
            TTSUserData.id == data_id
        ).first()


    def create_user_tts_data(self,user_id: UUID,organization_id:UUID, data_in: TTSUserDataCreate) -> TTSUserData:
        """Create TTS user data"""
        data = data_in.model_dump()
        api_key = data.pop('api_key')
        encrypted_key = self.security_manager.encrypt_api_key(api_key)
        
        db_obj = TTSUserData(
            user_id=user_id,
            organization_id=organization_id,
            encrypted_api_key=encrypted_key,
            **data
        )
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj


    def update_user_tts_data(
        self, db_obj: TTSUserData, obj_in: TTSUserDataUpdate
    ) -> TTSUserData:
        """Update TTS user data"""
        update_data = obj_in.model_dump(exclude_unset=True)
        
        if 'api_key' in update_data:
            api_key = update_data.pop('api_key')
            if api_key:
                update_data['encrypted_api_key'] = self.security_manager.encrypt_api_key(api_key)
        
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj


    def delete_user_tts_data(self, db_obj: TTSUserData) -> None:
        """Delete TTS user data"""
        self.db.delete(db_obj)
        self.db.commit()


    def get_decrypted_tts_api_key(self,db_obj: TTSUserData) -> str:
        """Get the decrypted TTS API key"""
        return self.security_manager.decrypt_api_key(db_obj.encrypted_api_key) 
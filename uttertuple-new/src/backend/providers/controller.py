from typing import List
from uuid import UUID

from fastapi import APIRouter, HTTPException, status, Request
from sqlalchemy.orm import Session

from auth.manager import AuthManager
from schemas.roles import Roles
import logging

logger = logging.getLogger(__name__)

from schemas.provider import (
    # LLM Provider
    LLMUserData, LLMUserDataCreate, LLMUserDataUpdate,
    # STT Provider
    STTUserData, STTUserDataCreate, STTUserDataUpdate,
    # TTS Provider
    TTSUserData, TTSUserDataCreate, TTSUserDataUpdate
)
from providers.manager import ProviderManager
from auth.manager import AuthManager

class ProvidersRestController:
    def __init__(self,auth_manager: AuthManager,db_session: Session, providers_manager: ProviderManager):
        self.auth_manager = auth_manager
        self.providers_manager = providers_manager
        self.db = db_session
    def prepare(self, app: APIRouter):
        # User LLM data endpoints
        @app.get("/providers/user/llm", response_model=List[LLMUserData], tags=["providers"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        def get_user_llm_data(
            request: Request,
            skip: int = 0,
            limit: int = 100,
        ):
            """
            Get current user's LLM data
            """
            user = request.state.user
            return self.providers_manager.get_user_llm_data(user_id=user["user_id"], skip=skip, limit=limit)


        @app.post("/providers/user/llm", response_model=LLMUserData, status_code=status.HTTP_201_CREATED, tags=["providers"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        def create_user_llm_data(
            request: Request,
            data_in: LLMUserDataCreate,
        ):
            """
            Create user LLM data
            """
            user = request.state.user
            logging.info(f"User: {user}")
            logging.info(f"Data in: {data_in}")
            return self.providers_manager.create_user_llm_data(user_id=user["user_id"],organization_id=user["current_organization"], data_in=data_in)


        @app.put("/providers/user/llm/{data_id}", response_model=LLMUserData, tags=["providers"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        def update_user_llm_data(
            request: Request,
            data_id: UUID,
            data_in: LLMUserDataUpdate,
        ):
            """
            Update user LLM data
            """
            user = request.state.user
            data = self.providers_manager.get_user_llm_data_by_id(user_id=user["user_id"], data_id=data_id)
            if not data:
                raise HTTPException(status_code=404, detail="LLM data not found")
            return self.providers_manager.update_user_llm_data(db_obj=data, obj_in=data_in)


        @app.delete("/providers/user/llm/{data_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["providers"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        def delete_user_llm_data(
            request: Request,
            data_id: UUID,
        ):
            """
            Delete user LLM data
            """
            user = request.state.user
            data = self.providers_manager.get_user_llm_data_by_id(user_id=user["user_id"], data_id=data_id)
            if not data:
                raise HTTPException(status_code=404, detail="LLM data not found")
            self.providers_manager.delete_user_llm_data(db_obj=data)
            return None

        # User STT data endpoints
        @app.get("/providers/user/stt", response_model=List[STTUserData], tags=["providers"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        def get_user_stt_data(
            request: Request,
            skip: int = 0,
            limit: int = 100,
        ):
            """
            Get current user's STT data
            """
            user = request.state.user
            return self.providers_manager.get_user_stt_data(user_id=user["user_id"], skip=skip, limit=limit)


        @app.post("/providers/user/stt", response_model=STTUserData, status_code=status.HTTP_201_CREATED, tags=["providers"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        def create_user_stt_data(
            request: Request,
            data_in: STTUserDataCreate,
        ):
            """
            Create user STT data
            """
            user = request.state.user
            return self.providers_manager.create_user_stt_data(user_id=user["user_id"], data_in=data_in)


        @app.put("/providers/user/stt/{data_id}", response_model=STTUserData, tags=["providers"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        def update_user_stt_data(
            request: Request,
            data_id: UUID,
            data_in: STTUserDataUpdate,
        ):
            """
            Update user STT data
            """
            user = request.state.user
            data = self.providers_manager.get_user_stt_data_by_id(user_id=user["user_id"], data_id=data_id)
            if not data:
                raise HTTPException(status_code=404, detail="STT data not found")
            return self.providers_manager.update_user_stt_data(db_obj=data, obj_in=data_in)


        @app.delete("/providers/user/stt/{data_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["providers"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        def delete_user_stt_data(
            request: Request,
            data_id: UUID,
        ):
            """
            Delete user STT data
            """
            user = request.state.user
            data = self.providers_manager.get_user_stt_data_by_id(user_id=user["user_id"], data_id=data_id)
            if not data:
                raise HTTPException(status_code=404, detail="STT data not found")
            self.providers_manager.delete_user_stt_data(db_obj=data)
            return None

        # User TTS data endpoints
        @app.get("/providers/user/tts", response_model=List[TTSUserData], tags=["providers"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        def get_user_tts_data(
            request: Request,
            skip: int = 0,
            limit: int = 100,
        ):
            """
            Get current user's TTS data
            """
            user = request.state.user
            return self.providers_manager.get_user_tts_data(user_id=user["user_id"],organization_id=user["current_organization"], skip=skip, limit=limit)


        @app.post("/providers/user/tts", response_model=TTSUserData, status_code=status.HTTP_201_CREATED, tags=["providers"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        def create_user_tts_data(
            request: Request,
            data_in: TTSUserDataCreate,
        ):
            """
            Create user TTS data
            """
            user = request.state.user
            return self.providers_manager.create_user_tts_data(user_id=user["user_id"],organization_id=user["current_organization"], data_in=data_in)


        @app.put("/providers/user/tts/{data_id}", response_model=TTSUserData, tags=["providers"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        def update_user_tts_data(
            request: Request,
            data_id: UUID,
            data_in: TTSUserDataUpdate,
        ):
            """
            Update user TTS data
            """
            user = request.state.user
            data = self.providers_manager.get_user_tts_data_by_id(user_id=user["user_id"], data_id=data_id)
            if not data:
                raise HTTPException(status_code=404, detail="TTS data not found")
            return self.providers_manager.update_user_tts_data(db_obj=data, obj_in=data_in)


        @app.delete("/providers/user/tts/{data_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["providers"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        def delete_user_tts_data(
            request: Request,
            data_id: UUID,
        ):
            """
            Delete user TTS data
            """
            user = request.state.user
            data = self.providers_manager.get_user_tts_data_by_id(user_id=user["user_id"], data_id=data_id)
            if not data:
                raise HTTPException(status_code=404, detail="TTS data not found")
            self.providers_manager.delete_user_tts_data(db_obj=data)
            return None 
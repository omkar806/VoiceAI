from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from schemas.api_key import APIKey, APIKeyCreate, APIKeyUpdate, APIKeyWithKey
from auth.manager import AuthManager
from schemas.roles import Roles
from settings.manager import SettingsManager

class SettingsRestController:
    def __init__(self, settings_manager: SettingsManager, auth_manager: AuthManager):
        self.settings_manager = settings_manager
        self.auth_manager = auth_manager

    def prepare(self, app: APIRouter):
        @app.get("/settings", response_model=List[APIKey], tags=["settings"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        def get_api_keys(
            request: Request,
            service_name: str = None,
        ) -> Any:
            """
            Get all API keys for the current user.
            """
            user = request.state.user
            if service_name:
                return self.settings_manager.get_by_service_name(user_id=user["user_id"], service_name=service_name)
            return self.settings_manager.get_by_user_id(user_id=user["user_id"])

        @app.post("/settings", response_model=APIKeyWithKey, tags=["settings"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        def create_api_key(
            request: Request,
            api_key_in: APIKeyCreate,
            
        ) -> Any:
            """
            Create a new API key.
            """
            user = request.state.user
            api_key = self.settings_manager.create(user_id=user["user_id"], obj_in=api_key_in)
            
            # Return decrypted key once, will not be accessible again
            return {
                "id": api_key.id,
                "user_id": api_key.user_id,
                "service_name": api_key.service_name,
                "key_name": api_key.key_name,
                "created_at": api_key.created_at,
                "updated_at": api_key.updated_at,
                "key": api_key_in.key,
            }


        @app.get("/settings/{api_key_id}", response_model=APIKey, tags=["settings"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        def get_api_key(
            request: Request,
            api_key_id: str,
            
        ) -> Any:
            """
            Get an API key by ID.
            """
            user = request.state.user
            api_key = self.settings_manager.get_by_id(api_key_id=api_key_id)
            if not api_key:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="API key not found",
                )
            if api_key.user_id != user["user_id"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to access this API key",
                )
            return api_key


        @app.put("/settings/{api_key_id}", response_model=APIKey, tags=["settings"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        def update_api_key(
            request: Request,
            api_key_id: str,
            api_key_in: APIKeyUpdate,
        ) -> Any:
            """
            Update an API key.
            """
            user = request.state.user
            api_key = self.settings_manager.get_by_id(api_key_id=api_key_id)
            if not api_key:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="API key not found",
                )
            if api_key.user_id != user["user_id"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to update this API key",
                )
            api_key = self.settings_manager.update(db_obj=api_key, obj_in=api_key_in)
            return api_key


        @app.delete("/settings/{api_key_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["settings"] )
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        def delete_api_key(
            request: Request,
            api_key_id: str,
        ):
            """
            Delete an API key.
            """
            user = request.state.user
            api_key = self.settings_manager.get_by_id(api_key_id=api_key_id)
            if not api_key:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="API key not found",
                )
            if api_key.user_id != user["user_id"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to delete this API key",
                )
            self.settings_manager.delete(api_key_id=api_key_id)
            return None
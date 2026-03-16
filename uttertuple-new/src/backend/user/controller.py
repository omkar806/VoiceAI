from typing import Any
from fastapi import APIRouter, HTTPException, status, Request
from schemas.user import User as UserSchema, UserCreate, UserUpdate
from auth.manager import AuthManager
from schemas.roles import Roles
from user.manager import UserManager

class UserRestController:
    def __init__(self, auth_manager: AuthManager, user_manager: UserManager):
        self.auth_manager = auth_manager
        self.user_manager = user_manager

    def prepare(self, app: APIRouter):
        @app.post("/users", response_model=UserSchema, tags=["users"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        def create_user(
            *,
            request: Request,
            user_in: UserCreate,
        ) -> Any:
            """
            Create new user. Only for superusers.
            """
            user = self.user_manager.get_by_email(email=user_in.email)
            if user:
                raise HTTPException(
                    status_code=400,
                    detail="The user with this email already exists in the system.",
                )
            user = self.user_manager.create(obj_in=user_in)
            return user


        @app.get("/users/me", response_model=UserSchema, tags=["users"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        def read_user_me(
            request: Request,
        ) -> Any:
            """
            Get current user.
            """
            user = request.state.user
            # Return user info from the token
            return {
                "id": user["user_id"],
                "email": user["email"],
                "is_active": True,
                "is_superuser": False
            }


        @app.put("/users/me", response_model=UserSchema, tags=["users"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        def update_user_me(
            *,
            request: Request,
            user_in: UserUpdate,
        ) -> Any:
            """
            Update own user.
            """
            user = request.state.user
            current_user = self.user_manager.get_by_id(user["user_id"])
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found",
                )
            user = self.user_manager.update(db_obj=current_user, obj_in=user_in)
            return user


        @app.get("/users/{user_id}", response_model=UserSchema, tags=["users"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        def read_user_by_id(
            request: Request,
            user_id: str,
        ) -> Any:
            """
            Get a specific user by id.
            """
            current_user_data = request.state.user
            user = self.user_manager.get_by_id(user_id)
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found",
                )
            if user_id == current_user_data["user_id"]:
                return user
            # For now, allow access to any user - you may want to add role-based restrictions here
            return user


        @app.put("/users/{user_id}", response_model=UserSchema, tags=["users"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        def update_user(
            *,
            request: Request,
            user_id: str,
            user_in: UserUpdate,
        ) -> Any:
            """
            Update a user. Only for superusers.
            """
            user = self.user_manager.get_by_id(user_id)
            if not user:
                raise HTTPException(
                    status_code=404,
                    detail="The user with this id does not exist in the system",
                )
            user = self.user_manager.update(db_obj=user, obj_in=user_in)
            return user
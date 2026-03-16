from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from schemas.token import Token
from schemas.user import User as UserSchema
from schemas.user import UserCreate, UserLogin
from auth.manager import AuthManager
from schemas.roles import Roles
from user.manager import UserManager
from security.manager import SecurityManager
from common.config import Configuration
class AuthRestController:
    def __init__(self,db_session: Session,config: Configuration, auth_manager: AuthManager, user_manager: UserManager, security_manager: SecurityManager):
        self.auth_manager = auth_manager
        self.db_session = db_session
        self.config = config
        self.user_manager = user_manager
        self.security_manager = security_manager    
    def prepare(self, app: APIRouter):
        @app.post("/auth/signup", response_model=UserSchema, tags=["auth"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        def signup(*, request: Request, user_in: UserCreate) -> Any:
            """
            Create a new user.
            """
            user = request.state.user
            # Check if user with this email already exists
            user = self.user_manager.get_by_email(email=user_in.email)
            if user:
                raise HTTPException(
                    status_code=status.HTTP_201_CREATED,
                    detail="A user with this email already exists",
                )
            
            # Create the user
            user = self.user_manager.create(obj_in=user_in)
            return user


        @app.post("/auth/login", response_model=Token, tags=["auth"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        def login(*, request: Request, form_data: UserLogin) -> Any:
            """
            OAuth2 compatible token login, get an access token for future requests.
            """
            user = request.state.user
            # Authenticate the user
            user = self.user_manager.authenticate(email=form_data.email, password=form_data.password)
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Incorrect email or password",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            # Check if user is active
            if not self.user_manager.is_active(user):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Inactive user",
                )
            
            # Update last login timestamp
            self.user_manager.update_last_login(user=user)
            
            # Create access token
            access_token_expires = timedelta(minutes=self.config.configuration().access_token_expire_minutes)
            return {
                "access_token": self.security_manager.create_access_token(
                    user.id, expires_delta=access_token_expires
                ),
                "token_type": "Bearer",
            }


        @app.post("/auth/login/access-token", response_model=Token, tags=["auth"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        def login_access_token_oauth(
            request: Request,
            form_data: OAuth2PasswordRequestForm = Depends()
        ) -> Any:
            """
            OAuth2 compatible token login, get an access token for future requests.
            Used for OpenAPI authentication.
            """
            user = request.state.user
            # Authenticate the user
            user = self.user_manager.authenticate(email=form_data.username, password=form_data.password)
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Incorrect email or password",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            # Check if user is active
            if not self.user_manager.is_active(user):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Inactive user",
                )
            
            # Update last login timestamp
            self.user_manager.update_last_login(user=user)
            
            # Create access token
            access_token_expires = timedelta(minutes=self.config.configuration().access_token_expire_minutes)
            return {
                "access_token": self.security_manager.create_access_token(
                    user.id, expires_delta=access_token_expires
                ),
                "token_type": "Bearer",
            }


        @app.get("/auth/me", response_model=UserSchema, tags=["auth"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        def get_me(request: Request) -> Any:
            """
            Get current user.
            """
            user = request.state.user
            return user
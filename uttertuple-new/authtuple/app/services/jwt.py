from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import jwt
from app.core.config import settings
from app.db.dependencies import get_async_db
from app.models.organization import Organization
from app.models.user import User, user_organization
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

oauth2_scheme = HTTPBearer()


class JWTService:
    @staticmethod
    async def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
        """
        Create a JWT access token.
        """
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
        return encoded_jwt

    @staticmethod
    async def create_refresh_token(data: Dict[str, Any]) -> str:
        """
        Create a JWT refresh token.
        """
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
        return encoded_jwt

    @staticmethod
    async def verify_token(token: str) -> Dict[str, Any]:
        """
        Verify and decode a JWT token.
        """
        try:
            payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
            return payload
        except jwt.PyJWTError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

    @staticmethod
    async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(oauth2_scheme), db: AsyncSession = Depends(get_async_db)) -> User:
        """
        Get the current user from the JWT token.
        """
        payload = await JWTService.verify_token(credentials.credentials)
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Query the user from the database
        result = await db.execute(select(User).filter(User.id == user_id))
        user = result.scalars().first()

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )

        return user

    @staticmethod
    async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
        """
        Check if the current user is active.
        """
        # current_user = await current_user
        if not current_user.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user")
        return current_user

    @staticmethod
    async def get_user_organizations(user: User, db: AsyncSession) -> List[Dict[str, Any]]:
        """
        Get all organizations for a user with their roles.
        """
        # Query organizations and user_organization association
        query = select(Organization, user_organization.c.role).join(user_organization, Organization.id == user_organization.c.organization_id).where(user_organization.c.user_id == user.id)

        result = await db.execute(query)
        organizations = []

        for organization, role in result:
            organizations.append({"id": str(organization.id), "name": organization.name, "role": role, "is_default": organization.is_default, "is_owner": organization.owner_id == user.id})

        return organizations

    @staticmethod
    async def create_user_token(user: User, db: AsyncSession) -> Dict[str, Any]:
        """
        Create access and refresh tokens for a user with their organizations.
        """
        # Get user organizations with roles
        organizations = await JWTService.get_user_organizations(user, db)

        # Create organization IDs list
        organization_ids = [w["id"] for w in organizations]

        # Find the default organization
        default_organization = next((w for w in organizations if w["is_default"]), None)
        default_organization_id = default_organization["id"] if default_organization else None

        # Token data
        token_data = {"sub": str(user.id), "email": user.email, "cognito_id": user.cognito_id, "organizations": organization_ids, "current_organization": default_organization_id, "roles": {w["id"]: w["role"] for w in organizations if w.get("role")}}

        # Create tokens
        access_token = await JWTService.create_access_token(data=token_data, expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))

        refresh_token = await JWTService.create_refresh_token(data={"sub": str(user.id)})

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "user": {"id": str(user.id), "email": user.email, "organizations": organizations, "current_organization": default_organization_id},
        }

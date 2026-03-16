import uuid
from typing import Any, Dict, List, Optional

from app.models.organization import Organization
from app.models.user import User
from app.services.cognito import CognitoService
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select


class UserService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.cognito_service = CognitoService()

    async def get_user_by_email(self, email: str) -> Optional[User]:
        """
        Get a user by email.
        """
        result = await self.db.execute(select(User).filter(User.email == email))
        return result.scalars().first()

    async def get_user_by_id(self, user_id: uuid.UUID) -> Optional[User]:
        """
        Get a user by ID.
        """
        result = await self.db.execute(select(User).filter(User.id == user_id))
        return result.scalars().first()

    async def get_user_by_cognito_id(self, cognito_id: str) -> Optional[User]:
        """
        Get a user by Cognito ID.
        """
        result = await self.db.execute(select(User).filter(User.cognito_id == cognito_id))
        return result.scalars().first()

    async def create_user(self, user_data: Dict[str, Any]) -> User:
        """
        Create a new user in the database.
        """
        user = User(cognito_id=user_data["cognito_id"], email=user_data["email"])
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def register_user(self, email: str, password: str, attributes: Dict[str, str] = None) -> Dict[str, Any]:
        """
        Register a new user with Cognito and in the database.
        """
        # Check if user exists
        existing_user = await self.get_user_by_email(email)
        if existing_user:
            return {"error": "Email already registered"}

        # Register with Cognito
        cognito_response = await self.cognito_service.register_user(email, password, attributes)
        if "error" in cognito_response:
            return cognito_response

        # Create user in database
        user_data = {"cognito_id": cognito_response["user_sub"], "email": email}
        user = await self.create_user(user_data)

        # Create default organization for user
        from app.services.organization import OrganizationService

        organization_service = OrganizationService(self.db)
        organization = await organization_service.create_organization({"name": f"{email}'s Organization", "description": "Default organization", "owner_id": user.id, "is_default": True})

        return {"user_id": str(user.id), "email": user.email, "cognito_id": user.cognito_id, "organization_id": str(organization.id), "is_confirmed": cognito_response["is_confirmed"]}

    async def confirm_registration(self, email: str, confirmation_code: str) -> Dict[str, Any]:
        """
        Confirm user registration with Cognito.
        """
        return await self.cognito_service.confirm_registration(email, confirmation_code)

    async def resend_confirmation(self, email: str) -> Dict[str, Any]:
        """
        Resend confirmation code to user's email.
        """
        return await self.cognito_service.resend_confirmation_code(email)

    async def login(self, email: str, password: str) -> Dict[str, Any]:
        """
        Login a user with Cognito and return tokens.
        """
        # Authenticate with Cognito
        cognito_response = await self.cognito_service.login(email, password)
        if "error" in cognito_response:
            return cognito_response

        # Get user info from Cognito
        user_info = await self.cognito_service.get_user(cognito_response["access_token"])
        if "error" in user_info:
            return user_info

        # Get user from database
        user = await self.get_user_by_email(email)
        if not user:
            # User exists in Cognito but not in our database
            # Fetch user_sub from Cognito attributes
            cognito_id = user_info["user_attributes"].get("sub")

            if cognito_id:
                user_data = {"cognito_id": cognito_id, "email": email}
                user = await self.create_user(user_data)

                # Create default organization for user
                from app.services.organization import OrganizationService

                organization_service = OrganizationService(self.db)
                await organization_service.create_organization({"name": f"{email}'s Organization", "description": "Default organization", "owner_id": user.id, "is_default": True})
            else:
                return {"error": "Could not retrieve user ID from Cognito"}

        # Create custom JWT with organization info
        from app.services.jwt import JWTService

        token_data = await JWTService.create_user_token(user, self.db)

        return token_data

    async def google_login(self, code: str) -> Dict[str, Any]:
        """
        Login user with Google OAuth.
        """
        # Process Google callback
        cognito_response = await self.cognito_service.process_google_callback(code)
        if "error" in cognito_response:
            return cognito_response

        # Get user info from Cognito
        user_info = await self.cognito_service.get_user(cognito_response["access_token"])
        if "error" in user_info:
            return user_info

        # Extract email
        email = None
        for attr in user_info.get("user_attributes", []):
            if attr["Name"] == "email":
                email = attr["Value"]
                break

        if not email:
            return {"error": "Could not retrieve email from Cognito"}

        # Extract cognito_id (sub)
        cognito_id = None
        for attr in user_info.get("user_attributes", []):
            if attr["Name"] == "sub":
                cognito_id = attr["Value"]
                break

        if not cognito_id:
            return {"error": "Could not retrieve user ID from Cognito"}

        # Check if user exists in our database
        user = await self.get_user_by_email(email)
        if not user:
            # Create user
            user_data = {"cognito_id": cognito_id, "email": email}
            user = await self.create_user(user_data)

            # Create default organization for user
            from app.services.organization import OrganizationService

            organization_service = OrganizationService(self.db)
            await organization_service.create_organization({"name": f"{email}'s Organization", "description": "Default organization", "owner_id": user.id, "is_default": True})

        # Create custom JWT with organization info
        from app.services.jwt import JWTService

        token_data = await JWTService.create_user_token(user, self.db)

        return token_data

    async def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        """
        Refresh tokens for a user.
        """
        # Verify the refresh token
        from app.services.jwt import JWTService

        try:
            payload = await JWTService.verify_token(refresh_token)
            user_id = payload.get("sub")
            if not user_id:
                return {"error": "Invalid refresh token"}

            # Get user
            user = await self.get_user_by_id(uuid.UUID(user_id))
            if not user:
                return {"error": "User not found"}

            # Create new tokens
            token_data = await JWTService.create_user_token(user, self.db)
            return token_data

        except Exception as e:
            return {"error": str(e)}

    async def get_user_organizations(self, user_id: uuid.UUID) -> List[Dict[str, Any]]:
        """
        Get all organizations for a user.
        """
        user = await self.get_user_by_id(user_id)
        if not user:
            return []

        from app.services.jwt import JWTService

        return await JWTService.get_user_organizations(user, self.db)

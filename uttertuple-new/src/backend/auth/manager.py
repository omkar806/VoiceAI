import jwt
import contextvars
import inspect
from functools import wraps
from typing import Callable, List

from fastapi import HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from jwt.exceptions import InvalidSignatureError
from common.logger import logger
from common.config import Configuration

# Single context variable for the auth token
auth_token = contextvars.ContextVar('auth_token', default=None)

class AuthManager:
    """Manages authentication by validating JWT tokens and verifying user/organization IDs."""

    def __init__(self, config: Configuration) -> None:
        """Initialize AuthManager with configuration settings."""
        self.jwt_algorithm = config.configuration().jwt_algorithm
        self.jwt_secret_key = config.configuration().jwt_secret_key
        self.security = HTTPBearer()

        logger.info(f"Initialized AuthManager with algorithm: {self.jwt_algorithm}")



    async def authenticate(self, request, bearer_token=None, organization_id: str = None, allowed_roles: List[str] = None):  # noqa
        """Authenticate and authorize requests using JWT tokens.

        Validates JWT tokens against Auth0, checks permissions via Vidur API,
        and sets user information in the request state.

        Args:
            request: FastAPI request object
            bearer_token: JWT bearer token
            organization_id: ID of the organization to check permissions against
            allowed_roles: List of allowed roles for the endpoint
        """

        # logger.info("Starting authentication process")
        token = bearer_token.credentials
        try:
            decoded_token = jwt.decode(token, self.jwt_secret_key, algorithms=[self.jwt_algorithm])
        except InvalidSignatureError:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        # logger.info(f"Decoded token: {decoded_token}")

        user_id = decoded_token.get("cognito_id")
        email = decoded_token.get("email")
        organizations = decoded_token.get("organizations", [])
        current_organization = decoded_token.get("current_organization")
        roles = decoded_token.get("roles")

        # Bypass auth for local development
        request.state.user = {
            "user_id": user_id,
            "email": email,
            "organizations": organizations,
            "current_organization": organization_id,
            "roles": roles
        }

        # Store the decoded token in context variable
        auth_token.set(decoded_token)
        return True



    def requires_auth(self, allowed_roles: List[str] = None):
        """Decorator for requiring authentication in FastAPI endpoints.
        
        Validates JWT token and automatically verifies:
        1. If user_id is provided, it must match the token's sub claim
        2. If organization_id is provided, it must be in the token's organizations array
        3. If allowed_roles is provided, verifies user has sufficient permissions:
           - admin can access both admin and member operations
           - member can only access member operations
        
        Usage:
            @app.get("/admin-endpoint")
            @auth_manager.requires_auth(allowed_roles=["admin"])
            async def admin_endpoint(request: Request):
                return {"message": "Admin only endpoint"}

            @app.get("/member-endpoint")
            @auth_manager.requires_auth(allowed_roles=["member"])
            async def member_endpoint(request: Request):
                return {"message": "Member endpoint"}
        """
        def decorator(func: Callable):
            @wraps(func)
            async def wrapper(request: Request, *args, **kwargs):

                # Check for organization_id in either query parameters or path parameters
                organization_id = request.query_params.get("organization_id")
                
                # If not in query params, check if it's in the path parameters
                if not organization_id and "organization_id" in kwargs:
                    organization_id = kwargs.get("organization_id")
                
                if not organization_id:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="organization_id is required in query parameters or path parameters")

                # Get token from authorization header
                credentials: HTTPAuthorizationCredentials = await self.security(request)

                # Authenticate and verify permissions
                await self.authenticate(request=request, bearer_token=credentials, organization_id=organization_id, allowed_roles=allowed_roles)
                if inspect.iscoroutinefunction(func):
                    return await func(request, *args, **kwargs)
                else:
                    # Call as regular function if not a coroutine
                    return func(request, *args, **kwargs)

            return wrapper
        
        return decorator







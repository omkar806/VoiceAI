import base64
import hashlib
import hmac
import json
from typing import Any, Dict, List, Optional

import boto3
import jwt
import requests
from app.core.config import settings
from botocore.exceptions import ClientError
from jose import jwk
from jose import jwt as jose_jwt


class CognitoService:
    def __init__(self):
        self.region = settings.AWS_REGION
        self.user_pool_id = settings.COGNITO_USER_POOL_ID
        self.client_id = settings.COGNITO_APP_CLIENT_ID
        self.client_secret = settings.COGNITO_APP_CLIENT_SECRET

        self.client = boto3.client("cognito-idp", region_name=self.region)

        # Cache for JWKs
        self._jwks = None

    def _get_secret_hash(self, username: str) -> str:
        """
        Generates a secret hash for the given username.
        """
        message = username + self.client_id
        dig = hmac.new(key=bytes(self.client_secret, "utf-8"), msg=bytes(message, "utf-8"), digestmod=hashlib.sha256).digest()
        return base64.b64encode(dig).decode()

    async def register_user(self, email: str, password: str, attributes: Dict[str, str] = None) -> Dict[str, Any]:
        """
        Register a new user in Cognito User Pool.
        """
        user_attributes = []

        if attributes:
            for key, value in attributes.items():
                user_attributes.append({"Name": key, "Value": value})

        # Always include email as an attribute
        user_attributes.append({"Name": "email", "Value": email})

        try:
            response = self.client.sign_up(ClientId=self.client_id, SecretHash=self._get_secret_hash(email), Username=email, Password=password, UserAttributes=user_attributes)
            return {"user_sub": response["UserSub"], "is_confirmed": response["UserConfirmed"]}
        except ClientError as e:
            return {"error": str(e)}

    async def confirm_registration(self, email: str, confirmation_code: str) -> Dict[str, Any]:
        """
        Confirm user registration with verification code.
        """
        try:
            response = self.client.confirm_sign_up(ClientId=self.client_id, SecretHash=self._get_secret_hash(email), Username=email, ConfirmationCode=confirmation_code)
            return {"success": True}
        except ClientError as e:
            return {"error": str(e)}

    async def login(self, email: str, password: str) -> Dict[str, Any]:
        """
        Authenticate a user and return tokens.
        """
        try:
            response = self.client.initiate_auth(ClientId=self.client_id, AuthFlow="USER_PASSWORD_AUTH", AuthParameters={"USERNAME": email, "PASSWORD": password, "SECRET_HASH": self._get_secret_hash(email)})

            auth_result = response.get("AuthenticationResult", {})
            return {"access_token": auth_result.get("AccessToken"), "id_token": auth_result.get("IdToken"), "refresh_token": auth_result.get("RefreshToken"), "expires_in": auth_result.get("ExpiresIn"), "token_type": auth_result.get("TokenType")}
        except ClientError as e:
            return {"error": str(e)}

    async def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        """
        Refresh tokens using a refresh token.
        """
        try:
            response = self.client.initiate_auth(ClientId=self.client_id, AuthFlow="REFRESH_TOKEN_AUTH", AuthParameters={"REFRESH_TOKEN": refresh_token, "SECRET_HASH": self._get_secret_hash("refresh")})  # Not actually used but required

            auth_result = response.get("AuthenticationResult", {})
            return {"access_token": auth_result.get("AccessToken"), "id_token": auth_result.get("IdToken"), "expires_in": auth_result.get("ExpiresIn"), "token_type": auth_result.get("TokenType")}
        except ClientError as e:
            return {"error": str(e)}

    async def get_user(self, access_token: str) -> Dict[str, Any]:
        """
        Get user information using an access token.
        """
        try:
            response = self.client.get_user(AccessToken=access_token)

            user_attributes = {}
            for attr in response.get("UserAttributes", []):
                user_attributes[attr["Name"]] = attr["Value"]

            return {"username": response.get("Username"), "user_attributes": user_attributes}
        except ClientError as e:
            return {"error": str(e)}

    async def forgot_password(self, email: str) -> Dict[str, Any]:
        """
        Initiate forgot password flow.
        """
        try:
            response = self.client.forgot_password(ClientId=self.client_id, SecretHash=self._get_secret_hash(email), Username=email)
            return {"delivery_details": response.get("CodeDeliveryDetails")}
        except ClientError as e:
            return {"error": str(e)}

    async def confirm_forgot_password(self, email: str, confirmation_code: str, new_password: str) -> Dict[str, Any]:
        """
        Complete forgot password flow with confirmation code and new password.
        """
        try:
            response = self.client.confirm_forgot_password(ClientId=self.client_id, SecretHash=self._get_secret_hash(email), Username=email, ConfirmationCode=confirmation_code, Password=new_password)
            return {"success": True}
        except ClientError as e:
            return {"error": str(e)}

    async def resend_confirmation_code(self, email: str) -> Dict[str, Any]:
        """
        Resend confirmation code to user's email.
        """
        try:
            response = self.client.resend_confirmation_code(ClientId=self.client_id, SecretHash=self._get_secret_hash(email), Username=email)
            return {"success": True, "delivery_details": response.get("CodeDeliveryDetails")}
        except ClientError as e:
            return {"error": str(e)}

    def _get_jwks(self) -> List[Dict[str, Any]]:
        """
        Get the JSON Web Key Set (JWKS) for token validation.
        """
        if self._jwks is None:
            keys_url = f"https://cognito-idp.{self.region}.amazonaws.com/{self.user_pool_id}/.well-known/jwks.json"
            response = requests.get(keys_url)
            self._jwks = response.json()["keys"]
        return self._jwks

    async def verify_token(self, token: str) -> Dict[str, Any]:
        """
        Verify and decode the JWT token.
        """
        # Get the kid (key ID) from the token header
        try:
            headers = jose_jwt.get_unverified_headers(token)
            kid = headers["kid"]

            # Find the matching key in the JWKS
            key = None
            for jwk_key in self._get_jwks():
                if jwk_key["kid"] == kid:
                    key = jwk_key
                    break

            if key is None:
                return {"error": "Key not found"}

            # Construct the public key
            public_key = jwk.construct(key)

            # Verify the token
            claims = jose_jwt.decode(token, public_key.to_dict(), algorithms=["RS256"], audience=self.client_id, issuer=f"https://cognito-idp.{self.region}.amazonaws.com/{self.user_pool_id}")

            return claims
        except Exception as e:
            return {"error": str(e)}

    async def google_auth_url(self) -> str:
        """
        Generate the Google OAuth URL for login.
        """
        return f"https://accounts.google.com/o/oauth2/v2/auth?" f"client_id={settings.GOOGLE_CLIENT_ID}" f"&redirect_uri={settings.GOOGLE_REDIRECT_URI}" f"&response_type=code" f"&scope=email profile"

    async def process_google_callback(self, code: str) -> Dict[str, Any]:
        """
        Process Google OAuth callback and create/login the user in Cognito.
        """
        # Exchange code for tokens
        token_url = "https://oauth2.googleapis.com/token"
        token_payload = {"code": code, "client_id": settings.GOOGLE_CLIENT_ID, "client_secret": settings.GOOGLE_CLIENT_SECRET, "redirect_uri": settings.GOOGLE_REDIRECT_URI, "grant_type": "authorization_code"}

        token_response = requests.post(token_url, data=token_payload)
        if token_response.status_code != 200:
            return {"error": "Failed to retrieve Google tokens"}

        token_data = token_response.json()
        id_token = token_data.get("id_token")

        # Decode the ID token to get user info
        # This is a simplified approach; in production, you should validate the token
        user_data = jwt.decode(id_token, options={"verify_signature": False})

        email = user_data.get("email")
        name = user_data.get("name", "")
        given_name = user_data.get("given_name", "")
        family_name = user_data.get("family_name", "")

        try:
            # Try to sign in with Google (Cognito federation)
            response = self.client.admin_initiate_auth(UserPoolId=self.user_pool_id, ClientId=self.client_id, AuthFlow="ADMIN_NO_SRP_AUTH", AuthParameters={"USERNAME": email, "PASSWORD": id_token})  # Use a placeholder password

            auth_result = response.get("AuthenticationResult", {})
            return {"access_token": auth_result.get("AccessToken"), "id_token": auth_result.get("IdToken"), "refresh_token": auth_result.get("RefreshToken"), "expires_in": auth_result.get("ExpiresIn"), "token_type": auth_result.get("TokenType")}
        except ClientError as e:
            if "UserNotFoundException" in str(e):
                # User doesn't exist, create a new user
                try:
                    # Create a temporary password
                    import secrets

                    temp_password = secrets.token_urlsafe(32)

                    # Create the user
                    self.client.admin_create_user(
                        UserPoolId=self.user_pool_id,
                        Username=email,
                        TemporaryPassword=temp_password,
                        UserAttributes=[
                            {"Name": "email", "Value": email},
                            {"Name": "email_verified", "Value": "true"},
                            {"Name": "name", "Value": name},
                            {"Name": "given_name", "Value": given_name},
                            {"Name": "family_name", "Value": family_name},
                        ],
                    )

                    # Set the user's password
                    self.client.admin_set_user_password(UserPoolId=self.user_pool_id, Username=email, Password=temp_password, Permanent=True)

                    # Log the user in
                    response = self.client.admin_initiate_auth(UserPoolId=self.user_pool_id, ClientId=self.client_id, AuthFlow="ADMIN_NO_SRP_AUTH", AuthParameters={"USERNAME": email, "PASSWORD": temp_password})

                    auth_result = response.get("AuthenticationResult", {})
                    return {
                        "access_token": auth_result.get("AccessToken"),
                        "id_token": auth_result.get("IdToken"),
                        "refresh_token": auth_result.get("RefreshToken"),
                        "expires_in": auth_result.get("ExpiresIn"),
                        "token_type": auth_result.get("TokenType"),
                        "is_new_user": True,
                    }
                except ClientError as create_error:
                    return {"error": str(create_error)}
            else:
                return {"error": str(e)}

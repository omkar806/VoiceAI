from datetime import datetime, timedelta
from typing import Any, Optional, Union
from jose import jwt
from common.config import Configuration
from passlib.context import CryptContext
from cryptography.fernet import Fernet
import logging



class SecurityManager:
    def __init__(self,config: Configuration):
        self.config = config.configuration()

        self.pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        # API key encryption with Fernet
        self.fernet = Fernet(self.config.encryption_key)

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against a hash."""
        return self.pwd_context.verify(plain_password, hashed_password)


    def get_password_hash(self, password: str) -> str:
        """Generate a password hash."""
        return self.pwd_context.hash(password)


    def encrypt_api_key(self, api_key: str) -> str:
        """Encrypt an API key."""
        return self.fernet.encrypt(api_key.encode()).decode()


    def decrypt_api_key(self, encrypted_key: str) -> str:
        """Decrypt an API key."""
        logging.info(f"Decrypting API key: {encrypted_key}")
        logging.info(f"Decrypted key: {self.config.encryption_key}")
        return self.fernet.decrypt(encrypted_key.encode()).decode()


    def create_access_token(self, subject: Union[str, Any], expires_delta: Optional[timedelta] = None) -> str:
        """Create a JWT access token."""
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=self.config.access_token_expire_minutes)
        
        to_encode = {"exp": expire, "sub": str(subject)}
        encoded_jwt = jwt.encode(to_encode, self.config.secret_key, algorithm="HS256")
        return encoded_jwt 
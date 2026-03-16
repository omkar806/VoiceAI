from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
from database.db_models import User
from schemas.user import UserCreate, UserUpdate
from security.manager import SecurityManager



class UserManager:
    def __init__(self,db_session: Session, security_manager: SecurityManager):
        self.db = db_session
        self.security_manager = security_manager

    def get_by_email(self, email: str) -> Optional[User]:
        """Get a user by email"""
        return self.db.query(User).filter(User.email == email).first()


    def get_by_id(self, user_id: str) -> Optional[User]:
        """Get a user by ID"""
        return self.db.query(User).filter(User.id == user_id).first()


    def create(self, obj_in: UserCreate) -> User:
        """Create a new user"""
        db_obj = User(
            email=obj_in.email,
            full_name=obj_in.full_name,
            password_hash=self.security_manager.get_password_hash(obj_in.password),
            is_active=True,
        )
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj


    def update(self, db_obj: User, obj_in: UserUpdate) -> User:
        """Update a user"""
        update_data = obj_in.dict(exclude_unset=True)
        
        if "password" in update_data and update_data["password"]:
            update_data["password_hash"] = self.security_manager.get_password_hash(update_data.pop("password"))
        
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        
        db_obj.updated_at = datetime.utcnow()
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj


    def update_last_login(self, user: User) -> User:
        """Update the user's last login timestamp"""
        user.last_login = datetime.utcnow()
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user


    def authenticate(self, email: str, password: str) -> Optional[User]:
        """Authenticate a user by email and password"""
        user = self.get_by_email(email=email)
        if not user:
            return None
        if not self.security_manager.verify_password(password, user.password_hash):
            return None
        return user


    def is_active(self,user: User) -> bool:
        """Check if a user is active"""
        return user.is_active 
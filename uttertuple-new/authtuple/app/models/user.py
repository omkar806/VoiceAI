import uuid

from app.db.base import Base
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Table
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

# Association table for many-to-many relationship between users and organizations
user_organization = Table(
    "user_organization",
    Base.metadata,
    Column("user_id", UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True),
    Column("organization_id", UUID(as_uuid=True), ForeignKey("organizations.id"), primary_key=True),
    Column("role", String(50), nullable=False, default="member"),  # For RBAC: admin, member, guest, etc.
    Column("created_at", DateTime(timezone=True), server_default=func.now()),
    Column("updated_at", DateTime(timezone=True), onupdate=func.now()),
)


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cognito_id = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    organizations = relationship("Organization", secondary=user_organization, back_populates="users")
    owned_organizations = relationship("Organization", back_populates="owner")

    def __repr__(self):
        return f"<User {self.email}>"

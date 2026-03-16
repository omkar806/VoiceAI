"""change_invitation_status_to_string

Revision ID: a28ed4feff51
Revises: d3b743c9b136
Create Date: 2025-04-14 09:54:07.105019

"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "a28ed4feff51"
down_revision = "d3b743c9b136"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create a temporary column for the status value as string
    op.add_column("invitations", sa.Column("status_str", sa.String(20), nullable=True))

    # Copy data from enum to string column
    op.execute("UPDATE invitations SET status_str = status::text")

    # Drop the constraint and enum column
    op.drop_column("invitations", "status")

    # Drop the enum type
    op.execute("DROP TYPE invitationstatus")

    # Create the new status column as string
    op.add_column("invitations", sa.Column("status", sa.String(20), nullable=False, server_default="pending"))

    # Copy data from temp column to new column
    op.execute("UPDATE invitations SET status = status_str")

    # Drop the temporary column
    op.drop_column("invitations", "status_str")


def downgrade() -> None:
    # Create the enum type
    invitationstatus = postgresql.ENUM("pending", "accepted", "rejected", "expired", name="invitationstatus", create_type=True)
    invitationstatus.create(op.get_bind(), checkfirst=False)

    # Create a temporary column for status as enum
    op.add_column("invitations", sa.Column("status_enum", sa.Enum("pending", "accepted", "rejected", "expired", name="invitationstatus"), nullable=True))

    # Copy data from string to enum column
    op.execute("UPDATE invitations SET status_enum = status::invitationstatus")

    # Drop the string column
    op.drop_column("invitations", "status")

    # Add the enum column back
    op.add_column("invitations", sa.Column("status", sa.Enum("pending", "accepted", "rejected", "expired", name="invitationstatus"), nullable=False, server_default="pending"))

    # Copy data from temporary column
    op.execute("UPDATE invitations SET status = status_enum")

    # Drop the temporary column
    op.drop_column("invitations", "status_enum")

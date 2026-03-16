"""add_collection_fields_to_agent

Revision ID: 3a15bc7d9e22
Revises: 2912ba6c7c48
Create Date: 2025-04-12 14:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '3a15bc7d9e22'
down_revision = '2912ba6c7c48'
branch_labels = None
depends_on = None


def upgrade():
    # Add collection_fields column to the agents table
    op.add_column('agents', sa.Column('collection_fields', sa.JSON(), server_default='[]', nullable=False))


def downgrade():
    # Remove collection_fields column from the agents table
    op.drop_column('agents', 'collection_fields') 
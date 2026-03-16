"""add_voice_id_to_agent

Revision ID: 2912ba6c7c48
Revises: f9fe7d486d90
Create Date: 2025-04-10 13:19:11.864600

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2912ba6c7c48'
down_revision = 'f9fe7d486d90'
branch_labels = None
depends_on = None


def upgrade():
    # Add voice_id column to the agents table
    op.add_column('agents', sa.Column('voice_id', sa.String(), nullable=True))


def downgrade():
    # Remove voice_id column from the agents table
    op.drop_column('agents', 'voice_id') 
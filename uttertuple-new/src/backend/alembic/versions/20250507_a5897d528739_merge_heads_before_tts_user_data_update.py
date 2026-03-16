"""merge heads before tts_user_data update

Revision ID: a5897d528739
Revises: af8f219c0c79, add_call_agent_table
Create Date: 2025-05-07 14:40:16.981012

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a5897d528739'
down_revision = ('af8f219c0c79', 'add_call_agent_table')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass 
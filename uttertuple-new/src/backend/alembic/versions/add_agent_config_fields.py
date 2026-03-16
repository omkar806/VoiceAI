"""Add LLM, TTS, and RAG configuration fields to Agent model

Revision ID: add_agent_config_fields
Revises: 000c8f2a1d5f
Create Date: 2023-11-14 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_agent_config_fields'
down_revision = '000c8f2a1d5f'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('agents', sa.Column('llm_provider_id', postgresql.UUID(), nullable=True))
    op.add_column('agents', sa.Column('llm_model', sa.String(), nullable=True))
    op.add_column('agents', sa.Column('tts_provider_id', postgresql.UUID(), nullable=True))
    op.add_column('agents', sa.Column('tts_config', sa.JSON(), nullable=True))
    op.add_column('agents', sa.Column('rag_config', sa.JSON(), nullable=True))


def downgrade():
    op.drop_column('agents', 'rag_config')
    op.drop_column('agents', 'tts_config')
    op.drop_column('agents', 'tts_provider_id')
    op.drop_column('agents', 'llm_model')
    op.drop_column('agents', 'llm_provider_id') 
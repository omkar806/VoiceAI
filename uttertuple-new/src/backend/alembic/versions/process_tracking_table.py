"""create process_tracking table

Revision ID: 000c8f2a1d5f
Revises: 
Create Date: 2025-04-17 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '000c8f2a1d5f'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'process_tracking',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('workflow_id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('process_id', sa.Integer(), nullable=False),
        sa.Column('started_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('status', sa.String(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_process_tracking_workflow_id'), 'process_tracking', ['workflow_id'], unique=False)
    op.create_index(op.f('ix_process_tracking_user_id'), 'process_tracking', ['user_id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_process_tracking_user_id'), table_name='process_tracking')
    op.drop_index(op.f('ix_process_tracking_workflow_id'), table_name='process_tracking')
    op.drop_table('process_tracking') 
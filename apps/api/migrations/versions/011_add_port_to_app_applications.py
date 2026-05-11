"""Add port column to app_applications

Revision ID: 011
Revises: 010
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "011"
down_revision: Union[str, None] = "010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("app_applications", sa.Column("port", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("app_applications", "port")


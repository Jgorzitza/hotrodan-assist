"""Baseline schema for data layer."""
from __future__ import annotations

from alembic import op

# revision identifiers, used by Alembic.
revision = "20240926_01"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    from data.models import Base  # Import inside to avoid circular deps

    bind = op.get_bind()
    Base.metadata.create_all(bind)


def downgrade() -> None:
    from data.models import Base

    bind = op.get_bind()
    Base.metadata.drop_all(bind)

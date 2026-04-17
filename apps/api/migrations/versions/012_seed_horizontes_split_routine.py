"""Seed routine horizontes-split en BD (opción 6 del selector legacy).

Revision ID: 012
Revises: 011
"""
from typing import Sequence, Union

from alembic import op

revision: str = "012"
down_revision: Union[str, None] = "011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_DESC = (
    "Reads horizontes.dat on a registered volume and writes one <Horizon>.dat "
    "per horizon block, preserving the original lines (legacy option 6 / "
    "partir_horizontes_3d.txt)."
)


def upgrade() -> None:
    op.execute(
        f"""
        INSERT INTO routines (
            id, slug, name, description, script, params, file_inputs,
            needs_datasource, module, execution_mode, created_at, updated_at
        )
        SELECT gen_random_uuid(),
               'horizontes-split',
               'Horizontes 3D split (horizontes.dat)',
               '{_DESC.replace("'", "''")}',
               'internal://horizontes_volume_split',
               '[]'::jsonb,
               '[]'::jsonb,
               false,
               'geology_geophysics',
               'horizontes_volume_split',
               now(),
               now()
        WHERE NOT EXISTS (SELECT 1 FROM routines WHERE slug = 'horizontes-split');
        """
    )
    op.execute(
        """
        UPDATE routines
        SET execution_mode = 'horizontes_volume_split',
            script = 'internal://horizontes_volume_split'
        WHERE slug = 'horizontes-split'
          AND execution_mode IS DISTINCT FROM 'horizontes_volume_split';
        """
    )


def downgrade() -> None:
    # No eliminamos la fila: puede tener historial de jobs.
    op.execute(
        """
        UPDATE routines
        SET execution_mode = 'subprocess'
        WHERE slug = 'horizontes-split'
          AND script = 'internal://horizontes_volume_split';
        """
    )

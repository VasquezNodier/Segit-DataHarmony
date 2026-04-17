"""Transformación horizontes.dat → archivos por Horizon (migración legacy bash/awk, opción 6)."""

from modules.routines.horizontes_split.service import (
    HorizontesSplitService,
    execute_horizontes_split_on_volume,
)

__all__ = ["HorizontesSplitService", "execute_horizontes_split_on_volume"]

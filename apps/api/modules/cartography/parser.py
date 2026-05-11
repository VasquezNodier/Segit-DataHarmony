"""
Parseo puro de nombres para la división cartográfica (sin I/O).

Dos patrones que reconocemos:

1. Nombre del directorio "dueño" del conjunto:
   `MAPA_LOC_DIST_LINDERO_TRAYECTORIA_{WELL}_{XCR}_MNal`

2. Nombre de archivo individual (PDF / MXD):
   `Loc_dist_Survey_{WELL}_{XCR}_MNal_SGC.{pdf|mxd}`
   `Loc_dist_{WELL}_{XCR}_MNal_SGC.{pdf|mxd}`

Mantenemos case-insensitive por requerimiento del negocio — los archivos
vienen mezclados en mayúsculas/minúsculas desde distintos operadores.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

_DIR_RE = re.compile(
    r"^MAPA_LOC_DIST_LINDERO_TRAYECTORIA_([A-Z0-9]+)_(\d+CR)_MNal$",
    re.IGNORECASE,
)

_FILE_RE = re.compile(
    r"^Loc_dist(?:_Survey)?_([A-Z0-9]+)_(\d+CR)_MNal_SGC\.(pdf|mxd)$",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class DirName:
    well: str
    cr: str


@dataclass(frozen=True)
class FileName:
    well: str
    cr: str
    extension: str  # "pdf" o "mxd", siempre en minúscula


def parse_source_dir_name(name: str) -> DirName | None:
    """Extrae (well, cr) del nombre del directorio fuente. None si no matchea."""
    m = _DIR_RE.match(name.strip())
    if not m:
        return None
    return DirName(well=m.group(1).upper(), cr=m.group(2).upper())


def parse_file_name(name: str) -> FileName | None:
    """Extrae (well, cr, ext) de un archivo PDF/MXD. None si no matchea."""
    m = _FILE_RE.match(name.strip())
    if not m:
        return None
    return FileName(
        well=m.group(1).upper(),
        cr=m.group(2).upper(),
        extension=m.group(3).lower(),
    )


def build_target_dir_name(well: str, cr: str) -> str:
    """Reconstruye `MAPA_LOC_DIST_LINDERO_TRAYECTORIA_{WELL}_{CR}_MNal`."""
    return f"MAPA_LOC_DIST_LINDERO_TRAYECTORIA_{well.upper()}_{cr.upper()}_MNal"


__all__ = [
    "DirName",
    "FileName",
    "parse_source_dir_name",
    "parse_file_name",
    "build_target_dir_name",
]

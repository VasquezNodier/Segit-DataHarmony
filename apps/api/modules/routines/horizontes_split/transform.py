"""Agrupación de líneas por horizonte preservando orden de aparición."""
from __future__ import annotations

import re

from modules.routines.horizontes_split.errors import HorizontesSplitParseError

_ALPHA = re.compile(r"[A-Za-z]")


def _is_header(line: str) -> tuple[bool, str]:
    """
    Replica `awk '$1 ~ /[a-zA-Z]/'`:
    un primer token con al menos un carácter alfabético marca encabezado.
    Retorna (es_header, token_inicial).
    """
    stripped = line.lstrip()
    if not stripped:
        return False, ""
    first = stripped.split(None, 1)[0]
    return bool(_ALPHA.search(first)), first


def group_lines_by_horizon(lines: list[str]) -> dict[str, list[str]]:
    """
    Dada una lista de líneas ya limpias, agrupa cada bloque numérico bajo el
    último horizonte cuyo primer token fue alfabético.

    Si aparece una línea de datos antes de cualquier header, falla.
    Si un header no tiene filas asociadas, se omite (igual que el awk legacy:
    awk crea el archivo sólo cuando se imprime al menos una línea).
    """
    groups: dict[str, list[str]] = {}
    order: list[str] = []
    current: str | None = None

    for line in lines:
        is_header, token = _is_header(line)
        if is_header:
            current = token.strip()
            if not current:
                raise HorizontesSplitParseError("Empty horizon header encountered")
            continue
        if current is None:
            raise HorizontesSplitParseError(
                "Data line before any horizon header (legacy awk would drop it)"
            )
        if current not in groups:
            groups[current] = []
            order.append(current)
        groups[current].append(line)

    if not groups:
        raise HorizontesSplitParseError(
            "No horizon blocks produced any data rows"
        )

    return {k: groups[k] for k in order}

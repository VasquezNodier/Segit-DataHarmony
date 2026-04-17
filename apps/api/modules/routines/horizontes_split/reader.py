"""Lectura y limpieza de horizontes.dat.

Replica el preprocesamiento legacy (bash) de la opción 6 del selector:
    sed -i '/^ *$/d' "$archivo"    # líneas en blanco
    sed -i '/\\!/d' "$archivo"       # líneas con '!'

Soporta dos formatos de entrada:

- **Texto plano** (ASCII / UTF-8 / CP-1252 / Latin-1).
- **Excel xlsx** (aunque venga con extensión `.dat`) — se detecta por el
  magic number ZIP `PK\\x03\\x04` y se delega en `xlsx_reader`.
"""
from __future__ import annotations

from loguru import logger

from modules.routines.horizontes_split.errors import HorizontesSplitParseError
from modules.routines.horizontes_split.xlsx_reader import (
    is_xlsx_payload,
    load_horizontes_lines_from_xlsx,
)

# Los archivos legacy de geología vienen típicamente generados en Windows
# (CP-1252 / Latin-1) con caracteres como 'º', 'ñ', tildes, etc. Intentamos
# UTF-8 primero (moderno, soporta BOM); si falla caemos a CP-1252 y luego a
# Latin-1 (que mapea cualquier byte 0x00-0xFF y nunca falla, red de seguridad).
_FALLBACK_ENCODINGS: tuple[str, ...] = ("utf-8-sig", "cp1252", "latin-1")


def _decode(raw: bytes) -> str:
    last_error: UnicodeDecodeError | None = None
    for enc in _FALLBACK_ENCODINGS:
        try:
            text = raw.decode(enc)
            if enc != "utf-8-sig":
                logger.info(
                    "horizontes_split: decoded input using fallback encoding={}",
                    enc,
                )
            return text
        except UnicodeDecodeError as e:
            last_error = e
            continue
    raise HorizontesSplitParseError(
        f"Cannot decode input with any of {_FALLBACK_ENCODINGS}: {last_error}"
    ) from last_error


def _load_text_lines(raw: bytes) -> list[str]:
    text = _decode(raw)
    out: list[str] = []
    for raw_line in text.splitlines():
        line = raw_line.rstrip("\r")
        if not line.strip():
            continue
        if "!" in line:
            continue
        out.append(line)
    return out


def load_horizontes_lines(raw: bytes) -> list[str]:
    """
    Retorna las líneas útiles del archivo:
      - sin líneas vacías / solo espacios
      - sin líneas que contengan '!' (comentarios legacy)
    Las líneas se devuelven sin salto de línea final.

    Soporta texto plano y xlsx renombrado a `.dat` (se detecta automáticamente).
    """
    if is_xlsx_payload(raw):
        logger.info("horizontes_split: xlsx payload detected, delegating to xlsx reader")
        return load_horizontes_lines_from_xlsx(raw)

    out = _load_text_lines(raw)
    if not out:
        raise HorizontesSplitParseError("Input file has no usable lines after cleanup")
    return out

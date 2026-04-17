"""Construcción de outputs `<Horizon>.dat` preservando las líneas originales."""
from __future__ import annotations

import re

_INVALID_FILENAME = re.compile(r'[\\/:*?"<>|]')


def validate_horizon_filename(horizon: str) -> None:
    if _INVALID_FILENAME.search(horizon):
        raise ValueError(
            f"Horizon name contains invalid path characters: {horizon!r} "
            r"(\ / : * ? \" < > |)"
        )


def build_outputs(grouped: dict[str, list[str]]) -> dict[str, str]:
    """horizon_name -> contenido UTF-8 del archivo `.dat`.

    Las líneas se copian tal cual venían del archivo de entrada (después del
    filtrado de vacíos / '!'), terminando con un salto de línea final.
    """
    out: dict[str, str] = {}
    for horizon, lines in grouped.items():
        validate_horizon_filename(horizon)
        filename = f"{horizon}.dat"
        content = "\n".join(lines) + ("\n" if lines else "")
        out[filename] = content
    return out


def summarize_row_counts(grouped: dict[str, list[str]]) -> dict[str, int]:
    """Conteo de filas por horizonte (para `job.result`)."""
    return {name: len(lines) for name, lines in grouped.items()}

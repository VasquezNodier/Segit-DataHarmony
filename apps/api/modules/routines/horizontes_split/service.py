"""
Servicio de dominio: split de horizontes.dat por nombre de horizonte sobre un volumen.

Migra la opción 6 (partir_horizontes_3d.txt) del script legacy a Python. Celery
orquesta el job (PENDING→RUNNING→SUCCESS/FAILURE); toda la lógica vive aquí.
"""
from __future__ import annotations

from typing import TYPE_CHECKING
from uuid import UUID

from loguru import logger
from sqlalchemy.orm import Session

from modules.routines.horizontes_split.errors import (
    HorizontesSplitConflictError,
    HorizontesSplitError,
)
from modules.routines.horizontes_split.reader import load_horizontes_lines
from modules.routines.horizontes_split.transform import group_lines_by_horizon
from modules.routines.horizontes_split.writer import build_outputs, summarize_row_counts
from modules.volumes.path_sanitize import join_under_share, sanitize_path_under_share
from modules.volumes.repository import get_volume_by_id
from modules.volumes.storage.base import StoragePathNotFoundError
from modules.volumes.storage.factory import get_adapter

if TYPE_CHECKING:
    pass


# Nombres de archivo aceptados para la entrada, en orden de preferencia.
# El reader detecta automáticamente si el contenido es texto plano o xlsx,
# así que aceptamos cualquiera de estas extensiones. Las variantes `.dat.xlsx`
# cubren el caso común en que alguien abre el .dat original en Excel y hace
# "Guardar como": Excel conserva el `.dat` en el nombre y añade `.xlsx`.
HORIZONTES_CANDIDATE_FILENAMES: tuple[str, ...] = (
    "horizontes.dat",
    "horizontes.xlsx",
    "horizontes.xls",
    "horizontes.dat.xlsx",
    "horizontes.dat.xls",
)


def _open_volume_adapter(db: Session, volume_id: UUID):
    vol = get_volume_by_id(db, volume_id)
    if not vol:
        raise HorizontesSplitError(f"Volume not found: {volume_id}")
    if not vol.is_active:
        raise HorizontesSplitError("Volume is inactive")
    return vol, get_adapter(vol)


class HorizontesSplitService:
    """Ejecución interna del flujo horizontes.dat → <Horizon>.dat en volumen."""

    @staticmethod
    def execute_on_volume(
        db: Session,
        volume_id: UUID,
        directory_path: str,
        *,
        overwrite_existing: bool = False,
    ) -> dict:
        """
        Lee `{directory}/horizontes.dat`, escribe `<Horizon>.dat` en el mismo directorio.
        Retorna dict listo para persistir en `job.result`.
        """
        vol, adapter = _open_volume_adapter(db, volume_id)
        share = vol.share_path or "/"

        try:
            dir_clean = sanitize_path_under_share(directory_path.strip() or share, share)
        except ValueError as e:
            raise HorizontesSplitError(str(e)) from e

        try:
            adapter.stat(dir_clean)
        except StoragePathNotFoundError:
            raise HorizontesSplitError(f"Directory not found: {dir_clean}") from None
        except Exception as e:
            raise HorizontesSplitError(f"Cannot access directory: {e}") from e

        raw: bytes | None = None
        input_path: str | None = None
        last_error: Exception | None = None
        for candidate in HORIZONTES_CANDIDATE_FILENAMES:
            remote = join_under_share(dir_clean, candidate)
            try:
                if not adapter.exists(remote):
                    continue
            except Exception as e:
                logger.warning("exists check failed for {}: {}", remote, e)
                continue
            try:
                raw = adapter.read_file(remote)
                input_path = remote
                logger.info(
                    "horizontes_split: input file found at {} (candidate={})",
                    remote,
                    candidate,
                )
                break
            except StoragePathNotFoundError:
                continue
            except Exception as e:
                last_error = e
                continue

        if raw is None or input_path is None:
            if last_error is not None:
                raise HorizontesSplitError(
                    f"Cannot read horizons input file: {last_error}"
                ) from last_error
            raise HorizontesSplitError(
                "No horizons input file found at {} (tried: {})".format(
                    dir_clean,
                    ", ".join(HORIZONTES_CANDIDATE_FILENAMES),
                )
            )

        lines = load_horizontes_lines(raw)
        grouped = group_lines_by_horizon(lines)
        outputs = build_outputs(grouped)

        conflicts: list[str] = []
        for fname in outputs:
            remote = join_under_share(dir_clean, fname)
            try:
                if adapter.exists(remote):
                    conflicts.append(fname)
            except Exception:
                logger.warning("exists check failed for {}", remote)

        if conflicts and not overwrite_existing:
            raise HorizontesSplitConflictError(
                "Output file(s) already exist. Enable overwrite or remove files.",
                conflicting_files=conflicts,
            )

        files_written: list[str] = []
        for fname, content in outputs.items():
            remote = join_under_share(dir_clean, fname)
            try:
                adapter.upload_file(remote, content.encode("utf-8"))
                files_written.append(remote)
            except Exception as e:
                raise HorizontesSplitError(f"Failed to write {fname}: {e}") from e

        row_counts = summarize_row_counts(grouped)
        return {
            "service": "horizontes_split",
            "filesWritten": files_written,
            "fileNames": list(outputs.keys()),
            "rowsPerHorizon": row_counts,
            "directory": dir_clean,
            "inputFile": input_path,
            "stdout": (
                f"Read input from {input_path}\n"
                f"Wrote {len(files_written)} file(s): {', '.join(outputs.keys())}\n"
                f"Rows per horizon: {row_counts}\n"
            ),
            "stderr": "",
        }


def execute_horizontes_split_on_volume(
    db: Session,
    volume_id: UUID,
    directory_path: str,
    *,
    overwrite_existing: bool = False,
) -> dict:
    """Alias funcional; preferir HorizontesSplitService.execute_on_volume."""
    return HorizontesSplitService.execute_on_volume(
        db,
        volume_id,
        directory_path,
        overwrite_existing=overwrite_existing,
    )

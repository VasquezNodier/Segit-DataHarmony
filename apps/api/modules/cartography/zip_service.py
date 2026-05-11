"""
Fase 2: empaquetado ZIP por pozo (MAPA + GDB común) sobre volumen remoto.

Streaming: chunks desde `download_file` → entradas en `ZipFile` → tempfile local
→ `upload_file(bytes)` al destino.
"""
from __future__ import annotations

import os
import posixpath
import tempfile
import zipfile
from uuid import UUID

from loguru import logger
from sqlalchemy.orm import Session

from modules.cartography.errors import (
    CartographySplitConflictError,
    CartographySplitError,
    CartographySplitValidationError,
)
from modules.volumes.path_sanitize import (
    InvalidVolumePathError,
    join_under_share,
    sanitize_path_under_share,
)
from modules.volumes.repository import get_volume_by_id
from modules.volumes.storage.base import BaseStorageAdapter, StoragePathNotFoundError
from modules.volumes.storage.factory import get_adapter


def _open_volume_adapter(db: Session, volume_id: UUID):
    vol = get_volume_by_id(db, volume_id)
    if not vol:
        raise CartographySplitError(f"Volume not found: {volume_id}")
    if not vol.is_active:
        raise CartographySplitError("Volume is inactive")
    return vol, get_adapter(vol)


def _sanitize(path: str, share: str, *, label: str) -> str:
    try:
        return sanitize_path_under_share(path.strip() or share, share)
    except InvalidVolumePathError as e:
        raise CartographySplitValidationError(f"{label}: {e}") from e


def _safe_exists(adapter: BaseStorageAdapter, path: str) -> bool:
    try:
        return bool(adapter.exists(path))
    except Exception as e:
        logger.warning("exists check failed for {}: {}", path, e)
        return False


def _stat_or_raise(adapter: BaseStorageAdapter, path: str, *, label: str) -> None:
    try:
        adapter.stat(path)
    except StoragePathNotFoundError:
        raise CartographySplitValidationError(f"{label} not found: {path}") from None
    except Exception as e:
        raise CartographySplitError(f"Cannot access {label} ({path}): {e}") from e


def find_gdb_name_in_dest(adapter: BaseStorageAdapter, dest_clean: str) -> str | None:
    """Primer directorio `*.gdb` (case-insensitive) directamente bajo dest_clean."""
    if not _safe_exists(adapter, dest_clean):
        return None
    try:
        entries = adapter.list_dir(dest_clean)
    except Exception as e:
        logger.warning("list_dir dest for gdb scan failed {}: {}", dest_clean, e)
        return None
    for entry in entries:
        if entry.is_dir and entry.name.lower().endswith(".gdb"):
            return entry.name
    return None


def gdb_full_path(dest_clean: str, gdb_name: str) -> str:
    return join_under_share(dest_clean, gdb_name)


def _stream_dir_into_zip(
    adapter: BaseStorageAdapter,
    dir_path: str,
    arc_base: str,
    zf: zipfile.ZipFile,
) -> None:
    """Añade recursivamente archivos bajo dir_path con prefijo arc_base."""
    try:
        entries = adapter.list_dir(dir_path)
    except Exception as e:
        raise CartographySplitError(f"Cannot list {dir_path}: {e}") from e
    for entry in entries:
        arcname = posixpath.join(arc_base, entry.name).replace("\\", "/")
        if entry.is_dir:
            _stream_dir_into_zip(adapter, entry.path, arcname, zf)
            continue
        with zf.open(arcname, "w") as zdest:
            for chunk in adapter.download_file(entry.path):
                zdest.write(chunk)


def zip_well_dir(
    adapter: BaseStorageAdapter,
    well_dir: str,
    gdb_path: str,
    dest_root: str,
    *,
    overwrite_existing: bool = False,
) -> dict:
    """
    Crea `{basename(well_dir)}.zip` en dest_root con el árbol well_dir + gdb_path.
    Retorna dict compatible con ZipResultEntry (snake_case interno).
    """
    well_name = posixpath.basename(well_dir.rstrip("/"))
    zip_name = f"{well_name}.zip"
    zip_remote_path = join_under_share(dest_root, zip_name)

    if _safe_exists(adapter, zip_remote_path):
        if not overwrite_existing:
            return {
                "zip_name": zip_name,
                "path": zip_remote_path,
                "status": "error",
                "message": "Already exists",
                "size_bytes": None,
            }
        try:
            adapter.delete(zip_remote_path)
        except Exception as e:
            return {
                "zip_name": zip_name,
                "path": zip_remote_path,
                "status": "error",
                "message": f"Cannot remove existing zip: {e}",
                "size_bytes": None,
            }

    tmp_path: str | None = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as tmp:
            tmp_path = tmp.name
        gdb_base = posixpath.basename(gdb_path.rstrip("/"))
        with zipfile.ZipFile(
            tmp_path, "w", zipfile.ZIP_DEFLATED, strict_timestamps=False
        ) as zf:
            _stream_dir_into_zip(adapter, well_dir, well_name, zf)
            _stream_dir_into_zip(adapter, gdb_path, gdb_base, zf)
        with open(tmp_path, "rb") as f:
            data = f.read()
        written = adapter.upload_file(zip_remote_path, data)
        return {
            "zip_name": zip_name,
            "path": zip_remote_path,
            "status": "ok",
            "message": "",
            "size_bytes": written,
        }
    except Exception as e:
        logger.exception("zip_well_dir failed for {}", well_dir)
        return {
            "zip_name": zip_name,
            "path": zip_remote_path,
            "status": "error",
            "message": str(e),
            "size_bytes": None,
        }
    finally:
        if tmp_path and os.path.isfile(tmp_path):
            try:
                os.unlink(tmp_path)
            except OSError:
                pass


def _zip_result_to_api(row: dict) -> dict:
    return {
        "zipName": row["zip_name"],
        "path": row["path"],
        "status": row["status"],
        "message": row["message"],
        "sizeBytes": row["size_bytes"],
    }


def run_zip_pack_phase(
    adapter: BaseStorageAdapter,
    dest_clean: str,
    well_dir_paths: list[str],
    *,
    overwrite_existing: bool = False,
) -> tuple[list[dict], str | None]:
    """
    Empaqueta cada well_dir en un ZIP bajo dest_clean, incluyendo el GDB común.
    Sin GDB: cada ítem error NO_GDB_FOUND (no aborta).
    """
    gdb_name = find_gdb_name_in_dest(adapter, dest_clean)
    if not gdb_name:
        return (
            [
                {
                    "zipName": f"{posixpath.basename(p.rstrip('/'))}.zip",
                    "path": join_under_share(
                        dest_clean, f"{posixpath.basename(p.rstrip('/'))}.zip"
                    ),
                    "status": "error",
                    "message": "NO_GDB_FOUND",
                    "sizeBytes": None,
                }
                for p in well_dir_paths
            ],
            None,
        )

    gdb_path = gdb_full_path(dest_clean, gdb_name)
    results: list[dict] = []
    for well_dir in well_dir_paths:
        raw = zip_well_dir(
            adapter,
            well_dir,
            gdb_path,
            dest_clean,
            overwrite_existing=overwrite_existing,
        )
        results.append(_zip_result_to_api(raw))
    return results, gdb_name


class CartographyZipService:
    """Preview / execute manual del empaquetado ZIP (sin split)."""

    @staticmethod
    def preview(
        db: Session,
        volume_id: UUID,
        dest_path: str,
        gdb_path: str,
        dirs_to_zip: list[str],
    ) -> dict:
        vol, adapter = _open_volume_adapter(db, volume_id)
        share = vol.share_path or "/"

        dest_clean = _sanitize(dest_path, share, label="destPath")
        gdb_clean = _sanitize(gdb_path, share, label="gdbPath")

        if not gdb_clean.lower().endswith(".gdb"):
            raise CartographySplitValidationError(
                "gdbPath must point to a directory whose name ends in .gdb"
            )

        _stat_or_raise(adapter, dest_clean, label="destPath")
        _stat_or_raise(adapter, gdb_clean, label="gdbPath")

        dirs_clean: list[str] = []
        for i, d in enumerate(dirs_to_zip):
            label = f"dirsToZip[{i}]"
            dc = _sanitize(d, share, label=label)
            if not dc.lower().startswith(dest_clean.lower().rstrip("/") + "/") and dc != dest_clean:
                # Permitimos que estén bajo el mismo share; solo exigimos existencia
                pass
            _stat_or_raise(adapter, dc, label=label)
            st = adapter.stat(dc)
            if not st.is_dir:
                raise CartographySplitValidationError(f"{label} is not a directory: {dc}")
            dirs_clean.append(dc)

        conflicts: list[dict] = []
        zips_planned: list[str] = []
        for d in dirs_clean:
            zn = f"{posixpath.basename(d.rstrip('/'))}.zip"
            zips_planned.append(zn)
            zp = join_under_share(dest_clean, zn)
            if _safe_exists(adapter, zp):
                conflicts.append({"path": zp, "reason": "ZIP file already exists"})

        gdb_found = posixpath.basename(gdb_clean.rstrip("/"))
        warnings: list[str] = []
        # Advertencia si el gdb no está bajo dest (solo informativo)
        if not gdb_clean.lower().startswith(
            dest_clean.lower().rstrip("/") + "/"
        ) and posixpath.normpath(gdb_clean) != posixpath.normpath(dest_clean):
            warnings.append(
                "gdbPath is outside destPath; ZIPs will still include that GDB tree."
            )

        return {
            "dest_path": dest_clean,
            "gdb_path": gdb_clean,
            "gdb_found": gdb_found,
            "dirs_to_zip": dirs_clean,
            "zips_to_create": zips_planned,
            "conflicts": conflicts,
            "warnings": warnings,
        }

    @staticmethod
    def zip_dirs(
        db: Session,
        volume_id: UUID,
        dest_path: str,
        gdb_path: str,
        dirs_to_zip: list[str],
        *,
        overwrite_existing: bool = False,
    ) -> dict:
        """Ejecuta empaquetado para rutas dadas; reutiliza la misma lógica que post-split."""
        plan = CartographyZipService.preview(
            db, volume_id, dest_path, gdb_path, dirs_to_zip
        )
        if plan["conflicts"] and not overwrite_existing:
            raise CartographySplitConflictError(
                "One or more ZIP files already exist. Enable overwrite or remove them.",
                conflicting_paths=[c["path"] for c in plan["conflicts"]],
            )

        _, adapter = _open_volume_adapter(db, volume_id)
        dest_clean = plan["dest_path"]
        gdb_clean = plan["gdb_path"]
        dirs_clean = plan["dirs_to_zip"]

        zip_results: list[dict] = []
        gdb_used = posixpath.basename(gdb_clean.rstrip("/"))

        for well_dir in dirs_clean:
            raw = zip_well_dir(
                adapter,
                well_dir,
                gdb_clean,
                dest_clean,
                overwrite_existing=overwrite_existing,
            )
            zip_results.append(_zip_result_to_api(raw))

        ok = sum(1 for z in zip_results if z["status"] == "ok")
        return {
            "service": "cartography_zip_pack",
            "destPath": dest_clean,
            "gdbPath": gdb_clean,
            "gdbUsed": gdb_used,
            "zipResults": zip_results,
            "summary": {"zipsOk": ok, "zipsTotal": len(zip_results)},
            "stdout": (
                f"ZIP pack complete under {dest_clean}\n"
                f"GDB: {gdb_used}\n"
                f"OK: {ok} / {len(zip_results)}\n"
            ),
            "stderr": "",
        }


def create_cartography_zip_job(
    db: Session,
    volume_id: UUID,
    dest_path: str,
    gdb_path: str,
    dirs_to_zip: list[str],
    *,
    overwrite_existing: bool = False,
):
    from modules.jobs.models import JobStatus
    from modules.jobs.repository import create_job, update_job

    payload = {
        "executionMode": "cartography_zip_pack",
        "volumeId": str(volume_id),
        "destPath": dest_path,
        "gdbPath": gdb_path,
        "dirsToZip": dirs_to_zip,
        "overwriteExisting": bool(overwrite_existing),
    }
    job = create_job(
        db,
        module="cartography",
        job_type="cartography_zip_pack",
        status=JobStatus.PENDING.value,
        payload=payload,
    )
    try:
        from modules.jobs.tasks import run_cartography_zip_pack

        result = run_cartography_zip_pack.delay(str(job.id))
        update_job(db, job, task_id=result.id)
    except Exception as e:
        logger.warning("Could not enqueue cartography zip job: {}", e)
    return job

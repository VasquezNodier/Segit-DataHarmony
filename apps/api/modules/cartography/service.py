"""
Servicio de dominio: división del directorio cartográfico por pozo sobre un volumen.

Dado un directorio con archivos `Loc_dist*.pdf/.mxd` de múltiples pozos más una
subcarpeta `SHP/`, genera una carpeta por pozo (incluido el dueño) bajo
`dest_path`. Para pozos ajenos: crea carpeta, mueve PDF/MXD y copia `SHP/`.
Para el dueño: mueve el directorio completo con `rename` (no-op si ya está en
la ruta canónica). Tras el split, fase ZIP: un `.zip` por carpeta MAPA que
incluye el árbol del `.gdb` detectado en destino.

Celery orquesta el job (PENDING→RUNNING→SUCCESS/FAILURE); toda la lógica de
negocio vive aquí.
"""
from __future__ import annotations

import posixpath
from collections import defaultdict
from uuid import UUID

from loguru import logger
from sqlalchemy.orm import Session

from modules.cartography.errors import (
    CartographySplitConflictError,
    CartographySplitError,
    CartographySplitValidationError,
)
from modules.cartography.parser import (
    FileName,
    build_target_dir_name,
    parse_file_name,
    parse_source_dir_name,
)
from modules.cartography.zip_service import find_gdb_name_in_dest, run_zip_pack_phase
from modules.volumes.path_sanitize import (
    InvalidVolumePathError,
    join_under_share,
    sanitize_path_under_share,
)
from modules.volumes.repository import get_volume_by_id
from modules.volumes.storage.base import (
    BaseStorageAdapter,
    StoragePathNotFoundError,
)
from modules.volumes.storage.factory import get_adapter


SHP_DIR_NAME = "SHP"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


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


def _stat_or_raise(adapter: BaseStorageAdapter, path: str, *, label: str) -> None:
    try:
        adapter.stat(path)
    except StoragePathNotFoundError:
        raise CartographySplitValidationError(f"{label} not found: {path}") from None
    except Exception as e:
        raise CartographySplitError(f"Cannot access {label} ({path}): {e}") from e


def _is_descendant_or_equal(child: str, parent: str) -> bool:
    """True si `child` es igual a `parent` o está dentro de `parent`."""
    c = posixpath.normpath(child).rstrip("/")
    p = posixpath.normpath(parent).rstrip("/")
    if c == p:
        return True
    return c.startswith(p + "/")


# ---------------------------------------------------------------------------
# Plan (preview)
# ---------------------------------------------------------------------------


class CartographySplitService:
    """División de directorio cartográfico por pozo."""

    # --------------------------- Preview --------------------------------

    @staticmethod
    def preview(
        db: Session,
        volume_id: UUID,
        source_path: str,
        dest_path: str,
    ) -> dict:
        """
        Escanea el directorio fuente y arma el plan de división sin modificar nada.
        Retorna dict listo para serializar a SplitPreviewResponse.
        """
        vol, adapter = _open_volume_adapter(db, volume_id)
        share = vol.share_path or "/"

        source_clean = _sanitize(source_path, share, label="sourcePath")
        dest_clean = _sanitize(dest_path, share, label="destPath")

        source_name = posixpath.basename(source_clean.rstrip("/"))
        dir_info = parse_source_dir_name(source_name)
        if dir_info is None:
            raise CartographySplitValidationError(
                f"Source directory name does not match "
                f"MAPA_LOC_DIST_LINDERO_TRAYECTORIA_<WELL>_<NCR>_MNal: {source_name!r}"
            )

        _stat_or_raise(adapter, source_clean, label="sourcePath")

        if _is_descendant_or_equal(dest_clean, source_clean):
            raise CartographySplitValidationError(
                "destPath cannot be the source directory or a descendant of it"
            )

        # El destino puede no existir todavía: en ese caso lo crearemos en execute.
        dest_exists = _safe_exists(adapter, dest_clean)

        # Listar entradas del source (sin recursividad)
        try:
            entries = adapter.list_dir(source_clean)
        except Exception as e:
            raise CartographySplitError(f"Cannot list source directory: {e}") from e

        files_by_well: dict[tuple[str, str], list[FileName]] = defaultdict(list)
        file_names_by_well: dict[tuple[str, str], list[str]] = defaultdict(list)
        unmatched_files: list[str] = []
        shp_folders: list[str] = []

        for entry in entries:
            if entry.is_dir:
                if entry.name.upper() == SHP_DIR_NAME:
                    shp_folders.append(entry.name)
                continue
            fi = parse_file_name(entry.name)
            if fi is None:
                unmatched_files.append(entry.name)
                continue
            files_by_well[(fi.well, fi.cr)].append(fi)
            file_names_by_well[(fi.well, fi.cr)].append(entry.name)

        owner_key = (dir_info.well, dir_info.cr)
        if owner_key not in files_by_well:
            logger.warning(
                "Owner well {} has no PDF/MXD files inside source {}",
                owner_key,
                source_clean,
            )

        # Construcción del plan por pozo
        detected_wells: list[dict] = []
        conflicts: list[dict] = []
        new_dirs = 0
        files_to_move = 0
        shp_copies_planned = 0

        # Ordenar de forma determinística: primero el dueño, luego alfabético por (well, cr)
        ordered_keys = sorted(
            files_by_well.keys(),
            key=lambda k: (0 if k == owner_key else 1, k[0], k[1]),
        )

        src_norm = posixpath.normpath(source_clean.rstrip("/"))

        for key in ordered_keys:
            well, cr = key
            is_owner = key == owner_key
            new_dir_name = build_target_dir_name(well, cr)
            target_dir_path = join_under_share(dest_clean, new_dir_name)
            tgt_norm = posixpath.normpath(target_dir_path.rstrip("/"))

            if is_owner:
                will_move = tgt_norm != src_norm
            else:
                will_move = True

            files_payload = [
                {"name": f_name, "extension": fi.extension}
                for f_name, fi in zip(
                    file_names_by_well[key], files_by_well[key], strict=True
                )
            ]

            if _safe_exists(adapter, target_dir_path):
                same_as_source = tgt_norm == src_norm
                if not same_as_source:
                    conflicts.append(
                        {
                            "path": target_dir_path,
                            "reason": "Target directory already exists",
                        }
                    )

            if not is_owner:
                new_dirs += 1
                files_to_move += len(files_payload)
                if shp_folders:
                    shp_copies_planned += 1

            detected_wells.append(
                {
                    "well": well,
                    "cr": cr,
                    "is_owner": is_owner,
                    "new_dir_name": new_dir_name,
                    "target_dir_path": target_dir_path,
                    "files": files_payload,
                    "will_move": will_move,
                }
            )

        # Si el destino no existe todavía, igualmente incluimos el plan pero avisamos
        if not dest_exists and new_dirs > 0:
            # No es un conflicto real: lo crearemos en execute
            logger.info("Destination path {} does not exist yet; will be created", dest_clean)

        gdb_found: str | None = None
        if dest_exists:
            gdb_found = find_gdb_name_in_dest(adapter, dest_clean)

        warnings: list[str] = []
        if gdb_found is None:
            warnings.append(
                "No GDB directory (*.gdb) found in destPath; ZIPs will fail with NO_GDB_FOUND"
            )

        zips_to_create = [f"{w['new_dir_name']}.zip" for w in detected_wells]
        owner_dir_will_move = any(
            w["is_owner"] and w["will_move"] for w in detected_wells
        )

        return {
            "source_path": source_clean,
            "dest_path": dest_clean,
            "source_dir_name": source_name,
            "owner_well": {"well": dir_info.well, "cr": dir_info.cr},
            "detected_wells": detected_wells,
            "shp_folders": shp_folders,
            "unmatched_files": unmatched_files,
            "conflicts": conflicts,
            "gdb_found": gdb_found,
            "zips_to_create": zips_to_create,
            "warnings": warnings,
            "summary": {
                "new_dirs_to_create": new_dirs,
                "files_to_move": files_to_move,
                "shp_copies_planned": shp_copies_planned,
                "zips_planned": len(zips_to_create),
                "owner_dir_will_move": owner_dir_will_move,
            },
        }

    # --------------------------- Execute --------------------------------

    @staticmethod
    def execute_on_volume(
        db: Session,
        volume_id: UUID,
        source_path: str,
        dest_path: str,
        *,
        overwrite_existing: bool = False,
    ) -> dict:
        """
        Ejecuta la división real y la fase ZIP. Retorna dict listo para `job.result`.

        1. Pozos ajenos: crear carpeta en dest, mover PDF/MXD, copiar SHP.
        2. Dueño: `rename` del directorio fuente completo a `{dest}/MAPA_..._owner`
           (no-op si ya está en esa ruta).
        3. ZIP por cada carpeta MAPA en destino + árbol `.gdb` detectado (sin
           abortar el job si falla un ZIP concreto o falta GDB).
        """
        vol, adapter = _open_volume_adapter(db, volume_id)
        share = vol.share_path or "/"

        source_clean = _sanitize(source_path, share, label="sourcePath")
        dest_clean = _sanitize(dest_path, share, label="destPath")

        source_name = posixpath.basename(source_clean.rstrip("/"))
        dir_info = parse_source_dir_name(source_name)
        if dir_info is None:
            raise CartographySplitValidationError(
                f"Source directory name does not match "
                f"MAPA_LOC_DIST_LINDERO_TRAYECTORIA_<WELL>_<NCR>_MNal: {source_name!r}"
            )

        _stat_or_raise(adapter, source_clean, label="sourcePath")
        if _is_descendant_or_equal(dest_clean, source_clean):
            raise CartographySplitValidationError(
                "destPath cannot be the source directory or a descendant of it"
            )

        # Re-ejecutamos preview para revalidar conflictos justo antes de mover
        # (defensa TOCTOU mínima).
        plan = CartographySplitService.preview(db, volume_id, source_path, dest_path)

        shp_folder_name: str | None = plan["shp_folders"][0] if plan["shp_folders"] else None

        wells_to_move = [w for w in plan["detected_wells"] if not w["is_owner"]]
        owner_plan = next(w for w in plan["detected_wells"] if w["is_owner"])

        # Conflictos: si existen carpetas destino y NO hay overwrite → fallar.
        if plan["conflicts"]:
            if not overwrite_existing:
                raise CartographySplitConflictError(
                    "One or more destination folders already exist. "
                    "Enable overwrite or remove them before running.",
                    conflicting_paths=[c["path"] for c in plan["conflicts"]],
                )
            # Con overwrite: borrar las carpetas destino que existían
            for c in plan["conflicts"]:
                try:
                    adapter.delete(c["path"])
                    logger.info("Overwrite: deleted existing directory {}", c["path"])
                except Exception as e:
                    raise CartographySplitError(
                        f"Failed to delete existing target {c['path']}: {e}"
                    ) from e

        # Asegurar que el destino raíz existe
        if not _safe_exists(adapter, dest_clean):
            try:
                adapter.create_folder(dest_clean)
                logger.info("Created destination root {}", dest_clean)
            except Exception as e:
                raise CartographySplitError(
                    f"Failed to create destination path {dest_clean}: {e}"
                ) from e

        created_dirs: list[str] = []
        moved_files: list[dict] = []
        shp_copies: list[dict] = []
        partial_success: dict[str, dict] = {}

        for well_plan in wells_to_move:
            target_dir = well_plan["target_dir_path"]
            well_key = (well_plan["well"], well_plan["cr"])
            ok_moves: list[str] = []
            ok_shp = False
            try:
                adapter.create_folder(target_dir)
                created_dirs.append(target_dir)

                for file_info in well_plan["files"]:
                    src = join_under_share(source_clean, file_info["name"])
                    dst = join_under_share(target_dir, file_info["name"])
                    adapter.rename(src, dst)
                    ok_moves.append(file_info["name"])
                    moved_files.append(
                        {
                            "well": well_plan["well"],
                            "cr": well_plan["cr"],
                            "name": file_info["name"],
                            "from": src,
                            "to": dst,
                        }
                    )

                if shp_folder_name is not None:
                    shp_src = join_under_share(source_clean, shp_folder_name)
                    shp_dst = join_under_share(target_dir, shp_folder_name)
                    adapter.copy(shp_src, shp_dst)
                    shp_copies.append(
                        {
                            "well": well_plan["well"],
                            "cr": well_plan["cr"],
                            "from": shp_src,
                            "to": shp_dst,
                        }
                    )
                    ok_shp = True
            except Exception as e:
                partial_success[f"{well_key[0]}_{well_key[1]}"] = {
                    "targetDir": target_dir,
                    "filesMoved": ok_moves,
                    "shpCopied": ok_shp,
                    "error": str(e),
                }
                raise CartographySplitError(
                    f"Failed while processing well {well_key[0]} {well_key[1]} "
                    f"at {target_dir}: {e}"
                ) from e

        owner_dir_moved_to: str | None = None
        if owner_plan["will_move"]:
            owner_target = owner_plan["target_dir_path"]
            try:
                adapter.rename(source_clean, owner_target)
                owner_dir_moved_to = owner_target
                logger.info(
                    "Owner directory renamed {} -> {}", source_clean, owner_target
                )
            except Exception as e:
                raise CartographySplitError(
                    f"Failed to move owner directory to {owner_target}: {e}"
                ) from e

        well_dirs = [w["target_dir_path"] for w in plan["detected_wells"]]
        zip_results, gdb_used_name = run_zip_pack_phase(
            adapter, dest_clean, well_dirs, overwrite_existing=False
        )

        row_summary = {
            "service": "cartography_maps_split",
            "ownerWell": plan["owner_well"],
            "sourcePath": source_clean,
            "destPath": dest_clean,
            "createdDirs": created_dirs,
            "movedFiles": moved_files,
            "shpCopies": shp_copies,
            "unmatchedFiles": plan["unmatched_files"],
            "ownerDirMovedTo": owner_dir_moved_to,
            "zipResults": zip_results,
            "gdbUsed": gdb_used_name,
            "summary": {
                "newDirsCreated": len(created_dirs),
                "filesMoved": len(moved_files),
                "shpCopiesDone": len(shp_copies),
                "zipsOk": sum(1 for z in zip_results if z.get("status") == "ok"),
                "zipsTotal": len(zip_results),
            },
            "stdout": (
                f"Source: {source_clean}\n"
                f"Owner: {plan['owner_well']['well']} {plan['owner_well']['cr']}\n"
                f"New dirs: {len(created_dirs)} — "
                f"Files moved: {len(moved_files)} — "
                f"SHP copies: {len(shp_copies)}\n"
                f"Owner dir: {owner_dir_moved_to or '(no move)'}\n"
                f"ZIPs OK: {sum(1 for z in zip_results if z.get('status') == 'ok')}"
                f" / {len(zip_results)}\n"
            ),
            "stderr": "",
        }
        if partial_success:
            row_summary["partialSuccess"] = partial_success
        return row_summary


def _safe_exists(adapter: BaseStorageAdapter, path: str) -> bool:
    try:
        return bool(adapter.exists(path))
    except Exception as e:
        logger.warning("exists check failed for {}: {}", path, e)
        return False


# ---------------------------------------------------------------------------
# Job creation helper
# ---------------------------------------------------------------------------


def create_cartography_split_job(
    db: Session,
    volume_id: UUID,
    source_path: str,
    dest_path: str,
    *,
    overwrite_existing: bool = False,
):
    """
    Crea un Job y lo encola en Celery para ejecutar la división.

    A diferencia de `create_job_from_routine`, no requiere una fila en `routines`:
    el worker reconoce este job por `payload.executionMode`.
    """
    from modules.jobs.models import JobStatus
    from modules.jobs.repository import create_job, update_job

    payload = {
        "executionMode": "cartography_maps_split",
        "volumeId": str(volume_id),
        "sourcePath": source_path,
        "destPath": dest_path,
        "overwriteExisting": bool(overwrite_existing),
    }
    job = create_job(
        db,
        module="cartography",
        job_type="cartography_split",
        status=JobStatus.PENDING.value,
        payload=payload,
    )
    try:
        from modules.jobs.tasks import run_cartography_split

        result = run_cartography_split.delay(str(job.id))
        update_job(db, job, task_id=result.id)
    except Exception as e:
        # Si Celery no está disponible, dejamos el job en PENDING.
        logger.warning("Could not enqueue cartography split job: {}", e)
    return job

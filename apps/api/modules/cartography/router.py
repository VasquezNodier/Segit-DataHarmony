"""
Router de cartografía.

Endpoints:
  POST /cartography/split/preview  — plan síncrono, sin tocar el volumen.
  POST /cartography/split/execute  — crea un job Celery que realiza la división.
  POST /cartography/zip/preview  — plan de empaquetado ZIP manual.
  POST /cartography/zip/execute  — job Celery para generar ZIPs.
"""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from loguru import logger

from core.dependencies import DbSession
from core.security import UserContext, get_current_user
from modules.cartography.errors import (
    CartographySplitConflictError,
    CartographySplitError,
    CartographySplitValidationError,
)
from modules.cartography.schemas import (
    SplitExecuteRequest,
    SplitExecuteResponse,
    SplitPreviewRequest,
    SplitPreviewResponse,
    ZipPackExecuteRequest,
    ZipPackExecuteResponse,
    ZipPackPreviewRequest,
    ZipPackPreviewResponse,
)
from modules.cartography.service import CartographySplitService, create_cartography_split_job
from modules.cartography.zip_service import CartographyZipService, create_cartography_zip_job


router = APIRouter(prefix="/cartography", tags=["cartography"])


@router.post("/split/preview", response_model=SplitPreviewResponse)
def split_preview(
    body: SplitPreviewRequest,
    db: DbSession,
    _user: UserContext = Depends(get_current_user),
):
    """Escanea el directorio fuente y retorna el plan de división sin modificar nada."""
    try:
        volume_uuid = UUID(body.volume_id.strip())
    except (ValueError, AttributeError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid volumeId: {e}") from e

    try:
        plan = CartographySplitService.preview(
            db,
            volume_uuid,
            body.source_path,
            body.dest_path,
        )
    except CartographySplitValidationError as e:
        raise HTTPException(status_code=400, detail=e.message) from e
    except CartographySplitError as e:
        logger.warning("cartography split preview failed: {}", e.message)
        raise HTTPException(status_code=422, detail=e.message) from e

    return SplitPreviewResponse.model_validate(plan)


@router.post(
    "/split/execute",
    response_model=SplitExecuteResponse,
    status_code=202,
)
def split_execute(
    body: SplitExecuteRequest,
    db: DbSession,
    _user: UserContext = Depends(get_current_user),
):
    """Encola un job Celery que ejecuta la división real sobre el volumen."""
    try:
        volume_uuid = UUID(body.volume_id.strip())
    except (ValueError, AttributeError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid volumeId: {e}") from e

    # Validaciones ligeras antes de crear el job: reutilizamos el preview para
    # fallar rápido si el nombre del directorio no matchea, etc. El execute de
    # Celery vuelve a validar para evitar TOCTOU.
    try:
        CartographySplitService.preview(
            db,
            volume_uuid,
            body.source_path,
            body.dest_path,
        )
    except CartographySplitValidationError as e:
        raise HTTPException(status_code=400, detail=e.message) from e
    except CartographySplitError as e:
        raise HTTPException(status_code=422, detail=e.message) from e

    try:
        job = create_cartography_split_job(
            db,
            volume_uuid,
            body.source_path,
            body.dest_path,
            overwrite_existing=body.overwrite_existing,
        )
    except CartographySplitConflictError as e:
        raise HTTPException(
            status_code=409,
            detail={"message": e.message, "conflictingPaths": e.conflicting_paths},
        ) from e
    except CartographySplitError as e:
        raise HTTPException(status_code=422, detail=e.message) from e

    return SplitExecuteResponse(
        jobId=str(job.id),
        taskId=job.task_id,
        status=job.status,
    )


@router.post("/zip/preview", response_model=ZipPackPreviewResponse)
def zip_pack_preview(
    body: ZipPackPreviewRequest,
    db: DbSession,
    _user: UserContext = Depends(get_current_user),
):
    """Valida rutas y lista conflictos con ZIPs ya existentes."""
    try:
        volume_uuid = UUID(body.volume_id.strip())
    except (ValueError, AttributeError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid volumeId: {e}") from e

    try:
        plan = CartographyZipService.preview(
            db,
            volume_uuid,
            body.dest_path,
            body.gdb_path,
            body.dirs_to_zip,
        )
    except CartographySplitValidationError as e:
        raise HTTPException(status_code=400, detail=e.message) from e
    except CartographySplitError as e:
        logger.warning("cartography zip preview failed: {}", e.message)
        raise HTTPException(status_code=422, detail=e.message) from e

    return ZipPackPreviewResponse.model_validate(plan)


@router.post(
    "/zip/execute",
    response_model=ZipPackExecuteResponse,
    status_code=202,
)
def zip_pack_execute(
    body: ZipPackExecuteRequest,
    db: DbSession,
    _user: UserContext = Depends(get_current_user),
):
    """Encola un job Celery que genera los ZIPs indicados."""
    try:
        volume_uuid = UUID(body.volume_id.strip())
    except (ValueError, AttributeError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid volumeId: {e}") from e

    try:
        CartographyZipService.preview(
            db,
            volume_uuid,
            body.dest_path,
            body.gdb_path,
            body.dirs_to_zip,
        )
    except CartographySplitValidationError as e:
        raise HTTPException(status_code=400, detail=e.message) from e
    except CartographySplitError as e:
        raise HTTPException(status_code=422, detail=e.message) from e

    try:
        job = create_cartography_zip_job(
            db,
            volume_uuid,
            body.dest_path,
            body.gdb_path,
            body.dirs_to_zip,
            overwrite_existing=body.overwrite_existing,
        )
    except CartographySplitConflictError as e:
        raise HTTPException(
            status_code=409,
            detail={"message": e.message, "conflictingPaths": e.conflicting_paths},
        ) from e
    except CartographySplitError as e:
        raise HTTPException(status_code=422, detail=e.message) from e

    return ZipPackExecuteResponse(
        jobId=str(job.id),
        taskId=job.task_id,
        status=job.status,
    )

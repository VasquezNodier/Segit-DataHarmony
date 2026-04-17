"""
Router de cartografía.

Endpoints:
  POST /cartography/split/preview  — plan síncrono, sin tocar el volumen.
  POST /cartography/split/execute  — crea un job Celery que realiza la división.
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
)
from modules.cartography.service import CartographySplitService, create_cartography_split_job


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

"""Schemas Pydantic para el módulo de cartografía."""
from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Request
# ---------------------------------------------------------------------------


class SplitPreviewRequest(BaseModel):
    """Body de POST /cartography/split/preview y /cartography/split/execute."""

    model_config = ConfigDict(populate_by_name=True)

    volume_id: str = Field(alias="volumeId")
    source_path: str = Field(alias="sourcePath")
    dest_path: str = Field(alias="destPath")


class SplitExecuteRequest(SplitPreviewRequest):
    """Execute agrega la bandera de sobreescritura."""

    overwrite_existing: bool = Field(default=False, alias="overwriteExisting")


# ---------------------------------------------------------------------------
# Response (preview)
# ---------------------------------------------------------------------------


class FileInPlan(BaseModel):
    name: str
    extension: str  # "pdf" | "mxd"


class WellPlan(BaseModel):
    """Plan de acción para un pozo concreto detectado en el source."""

    model_config = ConfigDict(populate_by_name=True)

    well: str
    cr: str
    is_owner: bool = Field(alias="isOwner")
    new_dir_name: str = Field(alias="newDirName")
    target_dir_path: str = Field(alias="targetDirPath")
    files: list[FileInPlan]
    will_move: bool = Field(alias="willMove")  # false para el dueño


class ConflictEntry(BaseModel):
    path: str
    reason: str


class SplitSummary(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    new_dirs_to_create: int = Field(alias="newDirsToCreate")
    files_to_move: int = Field(alias="filesToMove")
    shp_copies_planned: int = Field(alias="shpCopiesPlanned")


class OwnerInfo(BaseModel):
    well: str
    cr: str


class SplitPreviewResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    source_path: str = Field(alias="sourcePath")
    dest_path: str = Field(alias="destPath")
    source_dir_name: str = Field(alias="sourceDirName")
    owner_well: OwnerInfo = Field(alias="ownerWell")
    detected_wells: list[WellPlan] = Field(alias="detectedWells")
    shp_folders: list[str] = Field(alias="shpFolders")
    unmatched_files: list[str] = Field(alias="unmatchedFiles")
    conflicts: list[ConflictEntry]
    summary: SplitSummary


# ---------------------------------------------------------------------------
# Response (execute)
# ---------------------------------------------------------------------------


class SplitExecuteResponse(BaseModel):
    """Execute encola un job; devolvemos el id para que la UI siga el progreso."""

    model_config = ConfigDict(populate_by_name=True)

    job_id: str = Field(alias="jobId")
    task_id: str | None = Field(default=None, alias="taskId")
    status: str  # pending | running | success | failure

"""Schemas Pydantic para el módulo de cartografía."""
from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Request
# ---------------------------------------------------------------------------


class SplitPreviewRequest(BaseModel):
    """Body de POST /cartography/split/preview y /cartography/split/execute."""

    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    volume_id: str = Field(alias="volumeId")
    source_path: str = Field(alias="sourcePath")
    dest_path: str = Field(alias="destPath")


class SplitExecuteRequest(SplitPreviewRequest):
    """Execute agrega la bandera de sobreescritura."""

    overwrite_existing: bool = Field(default=False, alias="overwriteExisting")


class ZipPlanEntry(BaseModel):
    """Entrada de plan ZIP (referencia)."""

    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    zip_name: str = Field(alias="zipName")
    well_dir: str = Field(alias="wellDir")


class ZipPackPreviewRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    volume_id: str = Field(alias="volumeId")
    dest_path: str = Field(alias="destPath")
    gdb_path: str = Field(alias="gdbPath")
    dirs_to_zip: list[str] = Field(alias="dirsToZip")


class ZipPackExecuteRequest(ZipPackPreviewRequest):
    overwrite_existing: bool = Field(default=False, alias="overwriteExisting")


# ---------------------------------------------------------------------------
# Response (preview)
# ---------------------------------------------------------------------------


class FileInPlan(BaseModel):
    name: str
    extension: str  # "pdf" | "mxd"


class WellPlan(BaseModel):
    """Plan de acción para un pozo concreto detectado en el source."""

    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    well: str
    cr: str
    is_owner: bool = Field(alias="isOwner")
    new_dir_name: str = Field(alias="newDirName")
    target_dir_path: str = Field(alias="targetDirPath")
    files: list[FileInPlan]
    will_move: bool = Field(alias="willMove")


class ConflictEntry(BaseModel):
    path: str
    reason: str


class SplitSummary(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    new_dirs_to_create: int = Field(alias="newDirsToCreate")
    files_to_move: int = Field(alias="filesToMove")
    shp_copies_planned: int = Field(alias="shpCopiesPlanned")
    zips_planned: int = Field(default=0, alias="zipsPlanned")
    owner_dir_will_move: bool = Field(default=False, alias="ownerDirWillMove")


class OwnerInfo(BaseModel):
    well: str
    cr: str


class SplitPreviewResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    source_path: str = Field(alias="sourcePath")
    dest_path: str = Field(alias="destPath")
    source_dir_name: str = Field(alias="sourceDirName")
    owner_well: OwnerInfo = Field(alias="ownerWell")
    detected_wells: list[WellPlan] = Field(alias="detectedWells")
    shp_folders: list[str] = Field(alias="shpFolders")
    unmatched_files: list[str] = Field(alias="unmatchedFiles")
    conflicts: list[ConflictEntry]
    gdb_found: str | None = Field(default=None, alias="gdbFound")
    zips_to_create: list[str] = Field(default_factory=list, alias="zipsToCreate")
    warnings: list[str] = Field(default_factory=list)
    summary: SplitSummary


class ZipResultEntry(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    zip_name: str = Field(alias="zipName")
    path: str
    status: str
    message: str = ""
    size_bytes: int | None = Field(default=None, alias="sizeBytes")


class ZipPackPreviewResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    dest_path: str = Field(alias="destPath")
    gdb_path: str = Field(alias="gdbPath")
    gdb_found: str = Field(alias="gdbFound")
    dirs_to_zip: list[str] = Field(alias="dirsToZip")
    zips_to_create: list[str] = Field(alias="zipsToCreate")
    conflicts: list[ConflictEntry]
    warnings: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Response (execute)
# ---------------------------------------------------------------------------


class SplitExecuteResponse(BaseModel):
    """Execute encola un job; devolvemos el id para que la UI siga el progreso."""

    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    job_id: str = Field(alias="jobId")
    task_id: str | None = Field(default=None, alias="taskId")
    status: str  # pending | running | success | failure


class ZipPackExecuteResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    job_id: str = Field(alias="jobId")
    task_id: str | None = Field(default=None, alias="taskId")
    status: str

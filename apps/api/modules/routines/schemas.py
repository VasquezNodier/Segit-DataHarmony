"""Schemas Pydantic para routines."""
from uuid import UUID
from pydantic import BaseModel, Field
from typing import Any, TYPE_CHECKING

if TYPE_CHECKING:
    from modules.routines.models import Routine


# Modos de ejecución que usan el perfil UI `volume_path`
# (selector de volumen + explorador de directorios).
VOLUME_PATH_MODES: set[str] = {
    "fallas_volume_split",
    "horizontes_volume_split",
}


class ParamSchema(BaseModel):
    key: str
    label: str
    required: bool = False


class FileInputSchema(BaseModel):
    name: str
    label: str
    accept: str | None = None
    multiple: bool = False


class RoutineResponse(BaseModel):
    """Respuesta para la UI (camelCase en fileInputs, needsDatasource)."""
    id: UUID
    slug: str
    name: str
    description: str
    script: str
    params: list[dict[str, Any]] = Field(default_factory=list)
    fileInputs: list[dict[str, Any]] = Field(default_factory=list)
    needsDatasource: bool = False
    module: str = "geology_geophysics"
    executionProfile: str = "default"

    @classmethod
    def from_model(cls, r: "Routine") -> "RoutineResponse":
        mode = getattr(r, "execution_mode", None) or "subprocess"
        profile = "volume_path" if mode in VOLUME_PATH_MODES else "default"
        return cls(
            id=r.id,
            slug=r.slug,
            name=r.name,
            description=r.description,
            script=r.script,
            params=r.params or [],
            fileInputs=r.file_inputs or [],
            needsDatasource=r.needs_datasource,
            module=r.module or "geology_geophysics",
            executionProfile=profile,
        )


class RoutineCreate(BaseModel):
    slug: str
    name: str
    description: str = ""
    script: str
    params: list[dict[str, Any]] = Field(default_factory=list)
    file_inputs: list[dict[str, Any]] = Field(default_factory=list, alias="fileInputs")
    needs_datasource: bool = Field(default=False, alias="needsDatasource")
    module: str = "geology_geophysics"

    class Config:
        populate_by_name = True

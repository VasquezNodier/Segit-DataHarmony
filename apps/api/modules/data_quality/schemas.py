"""Schemas Pydantic para data_quality."""
from uuid import UUID
from pydantic import BaseModel, Field


# Scripts
class DQScriptCreate(BaseModel):
    name: str
    description: str = ""
    language: str = Field(..., pattern="^(python|bash|sql)$")
    content: str = ""


class DQScriptUpdate(BaseModel):
    content: str


class DQScriptResponse(BaseModel):
    id: UUID
    name: str
    description: str
    language: str
    content: str

    class Config:
        from_attributes = True


# Applications
class DQApplicationCreate(BaseModel):
    name: str
    description: str = ""
    url: str
    port: int | None = Field(default=None, ge=1, le=65535)
    category: str = "General"


class DQApplicationResponse(BaseModel):
    id: UUID
    name: str
    description: str
    url: str
    port: int | None = None
    category: str

    class Config:
        from_attributes = True


class DQApplicationUpdate(BaseModel):
    """Actualización completa de aplicación (mismos campos que creación)."""

    name: str
    description: str = ""
    url: str
    port: int | None = Field(default=None, ge=1, le=65535)
    category: str = "General"


# Documents
class DQDocumentCreate(BaseModel):
    title: str
    description: str = ""
    type: str = Field(..., pattern="^(markdown|link|file)$")
    content: str | None = None
    url: str | None = None
    file_id: UUID | None = None
    file_name: str | None = None
    mime_type: str | None = None
    file_size: int | None = None


class DQDocumentResponse(BaseModel):
    id: UUID
    title: str
    description: str
    type: str
    content: str | None
    url: str | None
    file_id: UUID | None
    file_name: str | None
    mime_type: str | None
    file_size: int | None

    class Config:
        from_attributes = True


# File upload response
class FileUploadResponse(BaseModel):
    fileId: str
    fileName: str
    mimeType: str
    fileSize: int

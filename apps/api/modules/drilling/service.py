"""
Servicios para Drilling.

Reutiliza las tablas compartidas (app_scripts, app_applications, app_documents)
filtrando por module=MODULE_DRILLING.
"""
from uuid import UUID
from sqlalchemy.orm import Session

from modules.data_quality.models import MODULE_DRILLING
from modules.data_quality.repository import (
    get_all_scripts,
    get_script_by_id,
    create_script,
    update_script,
    delete_script,
    get_all_applications,
    create_application,
    get_application_by_id,
    delete_application,
    get_all_documents,
    create_document,
    get_document_by_id,
    get_document_by_file_id,
    delete_document,
)
from modules.data_quality.schemas import (
    DQScriptCreate,
    DQScriptResponse,
    DQApplicationCreate,
    DQApplicationResponse,
    DQDocumentCreate,
    DQDocumentResponse,
)
from modules.data_quality.file_storage import save_file, read_file, delete_file
from modules.data_quality.preview import get_preview

import uuid


def _script_to_response(s) -> DQScriptResponse:
    return DQScriptResponse(
        id=s.id,
        name=s.name,
        description=s.description,
        language=s.language,
        content=s.content,
    )


def _app_to_response(a) -> DQApplicationResponse:
    return DQApplicationResponse(
        id=a.id,
        name=a.name,
        description=a.description,
        url=a.url,
        category=a.category,
    )


def _doc_to_response(d) -> DQDocumentResponse:
    return DQDocumentResponse(
        id=d.id,
        title=d.title,
        description=d.description,
        type=d.type,
        content=d.content,
        url=d.url,
        file_id=d.file_id,
        file_name=d.file_name,
        mime_type=d.mime_type,
        file_size=d.file_size,
    )


def list_scripts(db: Session) -> list[DQScriptResponse]:
    return [
        _script_to_response(s)
        for s in get_all_scripts(db, module=MODULE_DRILLING)
    ]


def get_script(db: Session, id: UUID):
    return get_script_by_id(db, id, module=MODULE_DRILLING)


def create_script_svc(db: Session, body: DQScriptCreate) -> DQScriptResponse:
    s = create_script(
        db,
        module=MODULE_DRILLING,
        name=body.name,
        description=body.description,
        language=body.language,
        content=body.content,
    )
    return _script_to_response(s)


def update_script_svc(db: Session, id: UUID, content: str) -> DQScriptResponse | None:
    s = get_script_by_id(db, id, module=MODULE_DRILLING)
    if not s:
        return None
    update_script(db, s, content)
    return _script_to_response(s)


def delete_script_svc(db: Session, id: UUID) -> bool:
    s = get_script_by_id(db, id, module=MODULE_DRILLING)
    if not s:
        return False
    delete_script(db, s)
    return True


def list_applications(db: Session) -> list[DQApplicationResponse]:
    return [
        _app_to_response(a)
        for a in get_all_applications(db, module=MODULE_DRILLING)
    ]


def create_application_svc(
    db: Session, body: DQApplicationCreate
) -> DQApplicationResponse:
    a = create_application(
        db,
        module=MODULE_DRILLING,
        name=body.name,
        description=body.description,
        url=body.url,
        category=body.category,
    )
    return _app_to_response(a)


def delete_application_svc(db: Session, id: UUID) -> bool:
    a = get_application_by_id(db, id, module=MODULE_DRILLING)
    if not a:
        return False
    delete_application(db, a)
    return True


def list_documents(db: Session) -> list[DQDocumentResponse]:
    return [
        _doc_to_response(d)
        for d in get_all_documents(db, module=MODULE_DRILLING)
    ]


def create_document_svc(db: Session, body: DQDocumentCreate) -> DQDocumentResponse:
    d = create_document(
        db,
        module=MODULE_DRILLING,
        title=body.title,
        description=body.description,
        type=body.type,
        content=body.content,
        url=body.url,
        file_id=body.file_id,
        file_name=body.file_name,
        mime_type=body.mime_type,
        file_size=body.file_size,
    )
    return _doc_to_response(d)


def delete_document_svc(db: Session, id: UUID) -> tuple[bool, UUID | None]:
    d = get_document_by_id(db, id, module=MODULE_DRILLING)
    if not d:
        return False, None
    fid = d.file_id
    delete_document(db, d)
    return True, fid


def upload_file(content: bytes, file_name: str, mime_type: str) -> dict:
    file_id = str(uuid.uuid4())
    save_file(file_id, content)
    return {
        "fileId": file_id,
        "fileName": file_name,
        "mimeType": mime_type,
        "fileSize": len(content),
    }


def get_file_content(file_id: str) -> bytes | None:
    try:
        return read_file(file_id)
    except FileNotFoundError:
        return None


def delete_file_svc(file_id: str) -> None:
    delete_file(file_id)


def get_preview_for_file(file_id: str, db: Session) -> dict | None:
    try:
        doc = get_document_by_file_id(db, UUID(file_id), module=MODULE_DRILLING)
    except (ValueError, TypeError):
        doc = None
    mime = doc.mime_type if doc else "application/octet-stream"
    fname = doc.file_name if doc else file_id
    try:
        buf = read_file(file_id)
    except FileNotFoundError:
        return None
    return get_preview(file_id, buf, mime, fname or "")

"""
Endpoints para Drilling.

Prefijo: /api/v1/drilling

Scripts, aplicaciones, documentación y archivos adjuntos (module=drilling).
"""
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile
from fastapi.responses import Response

from core.dependencies import DbSession
from core.security import get_current_user
from modules.data_quality.schemas import (
    DQScriptCreate,
    DQScriptUpdate,
    DQScriptResponse,
    DQApplicationCreate,
    DQApplicationResponse,
    DQApplicationUpdate,
    DQDocumentCreate,
    DQDocumentResponse,
    FileUploadResponse,
)
from modules.drilling.service import (
    list_scripts,
    get_script,
    create_script_svc,
    update_script_svc,
    delete_script_svc,
    list_applications,
    get_application_svc,
    create_application_svc,
    update_application_svc,
    delete_application_svc,
    list_documents,
    create_document_svc,
    delete_document_svc,
    upload_file,
    get_file_content,
    delete_file_svc,
    get_preview_for_file,
)

router = APIRouter(prefix="/drilling", tags=["drilling"])


def _user_dep():
    return Depends(get_current_user)


@router.get("/scripts", response_model=list[DQScriptResponse])
def get_scripts(db: DbSession, _user=_user_dep()):
    return list_scripts(db)


@router.post("/scripts", response_model=DQScriptResponse, status_code=status.HTTP_201_CREATED)
def post_script(body: DQScriptCreate, db: DbSession, _user=_user_dep()):
    return create_script_svc(db, body)


@router.get("/scripts/{id}", response_model=DQScriptResponse)
def get_script_one(id: UUID, db: DbSession, _user=_user_dep()):
    s = get_script(db, id)
    if not s:
        raise HTTPException(status_code=404, detail="Script not found")
    return DQScriptResponse(
        id=s.id,
        name=s.name,
        description=s.description,
        language=s.language,
        content=s.content,
    )


@router.put("/scripts/{id}")
def put_script(id: UUID, body: DQScriptUpdate, db: DbSession, _user=_user_dep()):
    r = update_script_svc(db, id, body.content)
    if not r:
        raise HTTPException(status_code=404, detail="Script not found")
    return {"ok": True}


@router.delete("/scripts/{id}", status_code=status.HTTP_204_NO_CONTENT)
def del_script(id: UUID, db: DbSession, _user=_user_dep()):
    if not delete_script_svc(db, id):
        raise HTTPException(status_code=404, detail="Script not found")


@router.get("/applications", response_model=list[DQApplicationResponse])
def get_applications(db: DbSession, _user=_user_dep()):
    return list_applications(db)


@router.get("/applications/{id}", response_model=DQApplicationResponse)
def get_application_one(id: UUID, db: DbSession, _user=_user_dep()):
    app = get_application_svc(db, id)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    return app


@router.post(
    "/applications",
    response_model=DQApplicationResponse,
    status_code=status.HTTP_201_CREATED,
)
def post_application(body: DQApplicationCreate, db: DbSession, _user=_user_dep()):
    return create_application_svc(db, body)


@router.put("/applications/{id}", response_model=DQApplicationResponse)
def put_application(id: UUID, body: DQApplicationUpdate, db: DbSession, _user=_user_dep()):
    app = update_application_svc(db, id, body)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    return app


@router.delete("/applications/{id}", status_code=status.HTTP_204_NO_CONTENT)
def del_application(id: UUID, db: DbSession, _user=_user_dep()):
    if not delete_application_svc(db, id):
        raise HTTPException(status_code=404, detail="Application not found")


@router.get("/documents", response_model=list[DQDocumentResponse])
def get_documents(db: DbSession, _user=_user_dep()):
    return list_documents(db)


@router.post(
    "/documents",
    response_model=DQDocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
def post_document(body: DQDocumentCreate, db: DbSession, _user=_user_dep()):
    return create_document_svc(db, body)


@router.delete("/documents/{id}", status_code=status.HTTP_204_NO_CONTENT)
def del_document(id: UUID, db: DbSession, _user=_user_dep()):
    ok, file_id = delete_document_svc(db, id)
    if not ok:
        raise HTTPException(status_code=404, detail="Document not found")
    if file_id:
        delete_file_svc(str(file_id))


@router.post("/files", response_model=FileUploadResponse, status_code=status.HTTP_201_CREATED)
async def post_file(file: UploadFile, _user=_user_dep()):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    content = await file.read()
    mime = file.content_type or "application/octet-stream"
    return upload_file(content, file.filename, mime)


@router.get("/files/{file_id}")
def get_file(file_id: str, _user=_user_dep()):
    content = get_file_content(file_id)
    if content is None:
        raise HTTPException(status_code=404, detail="File not found")
    return Response(
        content=content,
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'inline; filename="{file_id}"'},
    )


@router.get("/files/{file_id}/preview")
def get_file_preview(file_id: str, db: DbSession, _user=_user_dep()):
    result = get_preview_for_file(file_id, db)
    if result is None:
        raise HTTPException(status_code=404, detail="File or preview not found")
    return result

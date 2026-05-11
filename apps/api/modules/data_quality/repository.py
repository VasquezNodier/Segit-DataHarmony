"""Repositorios para data_quality."""
from uuid import UUID
from sqlalchemy.orm import Session

from modules.data_quality.models import AppScript, AppApplication, AppDocument, MODULE_DATA_QUALITY, MODULE_GEOLOGY_GEOPHYSICS  # noqa: F401


# Scripts
def get_all_scripts(db: Session, module: str = MODULE_DATA_QUALITY):
    return db.query(AppScript).filter(AppScript.module == module).order_by(AppScript.name).all()


def get_script_by_id(db: Session, id: UUID, module: str = MODULE_DATA_QUALITY) -> AppScript | None:
    return db.query(AppScript).filter(AppScript.id == id, AppScript.module == module).first()


def create_script(db: Session, module: str = MODULE_DATA_QUALITY, **kwargs) -> AppScript:
    s = AppScript(module=module, **kwargs)
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


def update_script(db: Session, s: AppScript, content: str) -> AppScript:
    s.content = content
    db.commit()
    db.refresh(s)
    return s


def delete_script(db: Session, s: AppScript) -> None:
    db.delete(s)
    db.commit()


# Applications
def get_all_applications(db: Session, module: str = MODULE_DATA_QUALITY):
    return db.query(AppApplication).filter(AppApplication.module == module).order_by(AppApplication.name).all()


def create_application(db: Session, module: str = MODULE_DATA_QUALITY, **kwargs) -> AppApplication:
    a = AppApplication(module=module, **kwargs)
    db.add(a)
    db.commit()
    db.refresh(a)
    return a


def get_application_by_id(db: Session, id: UUID, module: str = MODULE_DATA_QUALITY) -> AppApplication | None:
    return db.query(AppApplication).filter(AppApplication.id == id, AppApplication.module == module).first()


def update_application(db: Session, a: AppApplication, **kwargs) -> AppApplication:
    for key, value in kwargs.items():
        setattr(a, key, value)
    db.commit()
    db.refresh(a)
    return a


def delete_application(db: Session, a: AppApplication) -> None:
    db.delete(a)
    db.commit()


# Documents
def get_all_documents(db: Session, module: str = MODULE_DATA_QUALITY):
    return db.query(AppDocument).filter(AppDocument.module == module).order_by(AppDocument.title).all()


def create_document(db: Session, **kwargs) -> AppDocument:
    d = AppDocument(**kwargs)
    db.add(d)
    db.commit()
    db.refresh(d)
    return d


def get_document_by_id(db: Session, id: UUID, module: str = MODULE_DATA_QUALITY) -> AppDocument | None:
    return db.query(AppDocument).filter(AppDocument.id == id, AppDocument.module == module).first()


def get_document_by_file_id(db: Session, file_id: UUID, module: str | None = None) -> AppDocument | None:
    q = db.query(AppDocument).filter(AppDocument.file_id == file_id)
    if module:
        q = q.filter(AppDocument.module == module)
    return q.first()


def delete_document(db: Session, d: AppDocument) -> None:
    db.delete(d)
    db.commit()

"""
Modelos compartidos: scripts, aplicaciones y documentos.
Tablas app_scripts, app_applications, app_documents usadas por todos los módulos.
Cada registro tiene un 'module' que indica el contexto (data_quality, drilling, etc.).
"""
from sqlalchemy import Column, String, Integer, Text
from sqlalchemy.dialects.postgresql import UUID

from shared.base_model import Base, UUIDMixin, TimestampMixin

MODULE_DATA_QUALITY = "data_quality"
MODULE_GEOLOGY_GEOPHYSICS = "geology_geophysics"
MODULE_DRILLING = "drilling"


class AppScript(Base, UUIDMixin, TimestampMixin):
    """Script (Python, Bash, SQL). Compartido por todos los módulos."""
    __tablename__ = "app_scripts"

    module = Column(String(64), nullable=False, index=True)
    name = Column(String(256), nullable=False)
    description = Column(Text, default="", nullable=False)
    language = Column(String(32), nullable=False)  # python, bash, sql
    content = Column(Text, default="", nullable=False)


class AppApplication(Base, UUIDMixin, TimestampMixin):
    """Aplicación externa (URL). Compartida por todos los módulos."""
    __tablename__ = "app_applications"

    module = Column(String(64), nullable=False, index=True)
    name = Column(String(256), nullable=False)
    description = Column(Text, default="", nullable=False)
    url = Column(String(2048), nullable=False)
    port = Column(Integer, nullable=True)
    category = Column(String(128), default="General", nullable=False)


class AppDocument(Base, UUIDMixin, TimestampMixin):
    """Documento: markdown, link o archivo adjunto. Compartido por todos los módulos."""
    __tablename__ = "app_documents"

    module = Column(String(64), nullable=False, index=True)
    title = Column(String(512), nullable=False)
    description = Column(Text, default="", nullable=False)
    type = Column(String(32), nullable=False)  # markdown, link, file
    content = Column(Text, nullable=True)
    url = Column(String(2048), nullable=True)
    file_id = Column(UUID(as_uuid=True), nullable=True)
    file_name = Column(String(512), nullable=True)
    mime_type = Column(String(128), nullable=True)
    file_size = Column(Integer, nullable=True)



"""
FastAPI application - Segit-DataHarmony API
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from core.logging_config import setup_logging
from core.middleware import CorrelationIDMiddleware
from core.database import engine
from shared.base_model import Base
from modules.registry.router import router as registry_router
from modules.data_sources.router import router as data_sources_router
from modules.data_quality.router import router as data_quality_router
from modules.routines.router import router as routines_router
from modules.geology_geophysics.router import router as geology_geophysics_router
from modules.drilling.router import router as drilling_router
from modules.jobs.router import router as jobs_router
from modules.access_policies.router import router as access_policies_router
from modules.volumes.router import router as volumes_router

# Importar modelos para que Alembic los detecte
from modules.registry.models import AppModule, AppSection
from modules.jobs.models import Job
from modules.data_sources.models import DataSource
from modules.data_quality.models import AppScript, AppApplication, AppDocument
from modules.routines.models import Routine
from modules.access_policies.models import AccessPolicyRoutine, AccessPolicyModule
from modules.volumes.models import AppVolume, VolumeAuditLog


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    yield
    # cleanup si hace falta


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(CorrelationIDMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(registry_router, prefix="/api/v1")
app.include_router(data_sources_router, prefix="/api/v1")
app.include_router(data_quality_router, prefix="/api/v1")
app.include_router(routines_router, prefix="/api/v1")  # Alias legacy — conservar para compatibilidad
app.include_router(geology_geophysics_router, prefix="/api/v1")
app.include_router(drilling_router, prefix="/api/v1")
app.include_router(jobs_router, prefix="/api/v1")
app.include_router(access_policies_router, prefix="/api/v1")
app.include_router(volumes_router, prefix="/api/v1")


@app.get("/health")
def health():
    """Health check básico."""
    return {"status": "ok"}


@app.get("/health/db")
def health_db():
    """Verifica conexión a PostgreSQL."""
    from sqlalchemy import text
    from core.database import SessionLocal
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        return {"status": "error", "database": str(e)}

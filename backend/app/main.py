import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.core.config import settings
from backend.app.database.database import engine, Base
from backend.app.cleanup.cleanup_scheduler import cleanup_scheduler
from backend.app.api import (
    environments,
    terminal,
    files,
    monitoring,
    images,
    volumes,
    networks,
    activity,
    system
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("dvem.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing DVEM Database tables...")
    Base.metadata.create_all(bind=engine)
    
    logger.info("Starting DVEM background cleanup scheduler...")
    cleanup_scheduler.start()
    
    yield
    
    logger.info("Shutting down DVEM background cleanup scheduler...")
    cleanup_scheduler.stop()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="MCA Academic Project: Disposable Virtual Environment Manager (DVEM) using Docker Engine API",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(system.router, prefix=settings.API_PREFIX)
app.include_router(environments.router, prefix=settings.API_PREFIX)
app.include_router(terminal.router, prefix=settings.API_PREFIX)
app.include_router(files.router, prefix=settings.API_PREFIX)
app.include_router(monitoring.router, prefix=settings.API_PREFIX)
app.include_router(images.router, prefix=settings.API_PREFIX)
app.include_router(volumes.router, prefix=settings.API_PREFIX)
app.include_router(networks.router, prefix=settings.API_PREFIX)
app.include_router(activity.router, prefix=settings.API_PREFIX)

# Serve built frontend if available
import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

frontend_dist = os.path.join(settings.DATA_PATH.parent, "frontend", "dist")
if os.path.isdir(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))
else:
    @app.get("/")
    def root():
        return {
            "message": "Welcome to Disposable Virtual Environment Manager (DVEM) API",
            "docs": "/docs",
            "version": settings.VERSION
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=True)

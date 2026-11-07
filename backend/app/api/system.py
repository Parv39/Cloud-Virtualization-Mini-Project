from fastapi import APIRouter
from backend.app.docker.docker_service import docker_service, TEMPLATES

router = APIRouter(prefix="/system", tags=["System"])

@router.get("/health")
def health_check():
    docker_ok = docker_service.ping()
    return {
        "status": "healthy" if docker_ok else "degraded",
        "docker_connected": docker_ok,
        "app_name": "Disposable Virtual Environment Manager (DVEM)",
        "version": "1.0.0"
    }

@router.get("/docker")
def docker_info():
    return docker_service.get_system_info()

@router.get("/templates")
def get_templates():
    return TEMPLATES

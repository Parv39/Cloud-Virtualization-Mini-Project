from fastapi import APIRouter
from backend.app.schemas.schemas import HostMetricsResponse
from backend.app.monitoring.monitoring_service import monitoring_service

router = APIRouter(prefix="/monitoring", tags=["Monitoring"])

@router.get("/host", response_model=HostMetricsResponse)
def get_host_metrics():
    return monitoring_service.get_host_metrics()

@router.get("/container/{container_id}")
def get_container_metrics(container_id: str):
    return monitoring_service.get_container_metrics(container_id)

import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.database.database import get_db
from backend.app.models.models import DockerNetwork, ActivityLog
from backend.app.schemas.schemas import NetworkCreate, NetworkResponse
from backend.app.docker.docker_service import docker_service

router = APIRouter(prefix="/networks", tags=["Virtual Networks"])

@router.get("", response_model=List[NetworkResponse])
def get_networks(db: Session = Depends(get_db)):
    nets = db.query(DockerNetwork).all()
    return [NetworkResponse.model_validate(n) for n in nets]

@router.post("", response_model=NetworkResponse, status_code=201)
def create_network(payload: NetworkCreate, db: Session = Depends(get_db)):
    existing = db.query(DockerNetwork).filter(DockerNetwork.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Network '{payload.name}' already exists.")

    docker_net_name = f"dvem_net_{payload.name}"
    try:
        net = docker_service.create_network(docker_net_name, driver=payload.driver)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create Docker network: {e}")

    docker_net = DockerNetwork(
        name=payload.name,
        docker_network_id=net.short_id,
        driver=payload.driver,
        subnet="auto",
        created_at=datetime.datetime.utcnow()
    )
    db.add(docker_net)
    db.add(ActivityLog(
        action="create_network",
        status="success",
        details=f"Created Docker isolated network '{docker_net_name}' ({net.short_id})."
    ))
    db.commit()
    db.refresh(docker_net)
    return NetworkResponse.model_validate(docker_net)

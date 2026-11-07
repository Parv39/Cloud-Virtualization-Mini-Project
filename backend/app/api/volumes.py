import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.database.database import get_db
from backend.app.models.models import PersistentVolume, ActivityLog
from backend.app.schemas.schemas import VolumeCreate, VolumeResponse
from backend.app.docker.docker_service import docker_service

router = APIRouter(prefix="/volumes", tags=["Persistent Volumes"])

@router.get("", response_model=List[VolumeResponse])
def get_volumes(db: Session = Depends(get_db)):
    # Query database records
    db_vols = db.query(PersistentVolume).all()
    return [VolumeResponse.model_validate(v) for v in db_vols]

@router.post("", response_model=VolumeResponse, status_code=201)
def create_volume(payload: VolumeCreate, db: Session = Depends(get_db)):
    existing = db.query(PersistentVolume).filter(PersistentVolume.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Volume '{payload.name}' already registered.")

    docker_vol_name = f"dvem_vol_{payload.name}"
    try:
        docker_service.create_volume(docker_vol_name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create Docker volume: {e}")

    vol = PersistentVolume(
        name=payload.name,
        docker_volume_name=docker_vol_name,
        mount_path=payload.mount_path,
        description=payload.description or "",
        created_at=datetime.datetime.utcnow()
    )
    db.add(vol)
    db.add(ActivityLog(
        action="create_volume",
        status="success",
        details=f"Created Docker persistent volume '{docker_vol_name}' mounted at '{payload.mount_path}'."
    ))
    db.commit()
    db.refresh(vol)
    return VolumeResponse.model_validate(vol)

@router.delete("/{vol_id}")
def delete_volume(vol_id: int, db: Session = Depends(get_db)):
    vol = db.query(PersistentVolume).filter(PersistentVolume.id == vol_id).first()
    if not vol:
        raise HTTPException(status_code=404, detail="Volume not found")

    try:
        docker_service.delete_volume(vol.docker_volume_name, force=True)
    except Exception as e:
        pass

    db.add(ActivityLog(
        action="delete_volume",
        status="success",
        details=f"Deleted persistent volume '{vol.docker_volume_name}'."
    ))
    db.delete(vol)
    db.commit()
    return {"message": f"Volume '{vol.name}' removed successfully."}

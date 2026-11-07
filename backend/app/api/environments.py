import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from backend.app.database.database import get_db
from backend.app.models.models import Environment, ActivityLog, PersistentVolume
from backend.app.schemas.schemas import EnvironmentCreate, EnvironmentResponse, EnvironmentStats
from backend.app.docker.docker_service import docker_service, TEMPLATES

router = APIRouter(prefix="/environments", tags=["Environments"])

def _calculate_remaining_seconds(expires_at: Optional[datetime.datetime]) -> Optional[int]:
    if not expires_at:
        return None
    delta = (expires_at - datetime.datetime.utcnow()).total_seconds()
    return max(0, int(delta))

@router.get("", response_model=List[EnvironmentResponse])
def get_environments(db: Session = Depends(get_db)):
    envs = db.query(Environment).all()
    
    # Reconcile container status with actual Docker Engine state
    client = docker_service.get_client()
    for env in envs:
        if env.container_id:
            try:
                container = client.containers.get(env.container_id)
                actual_status = container.status # running, exited, paused, etc.
                if env.status != actual_status:
                    env.status = actual_status
            except Exception:
                env.status = "stopped"
        elif env.status != "expired":
            env.status = "stopped"
    db.commit()

    results = []
    for env in envs:
        resp = EnvironmentResponse.model_validate(env)
        resp.remaining_seconds = _calculate_remaining_seconds(env.expires_at)
        results.append(resp)
    return results

@router.post("", response_model=EnvironmentResponse, status_code=201)
def create_environment(payload: EnvironmentCreate, db: Session = Depends(get_db)):
    # 1. Check duplicate name
    existing = db.query(Environment).filter(Environment.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"An environment named '{payload.name}' already exists.")

    # 2. Resolve template and image
    template_config = TEMPLATES.get(payload.template_type, TEMPLATES["ubuntu"])
    selected_image = payload.image or template_config["image"]
    
    # 3. Calculate expiration
    expires_at = None
    if payload.expiration_minutes and payload.expiration_minutes > 0:
        expires_at = datetime.datetime.utcnow() + datetime.timedelta(minutes=payload.expiration_minutes)

    # 4. Create actual Docker container
    try:
        container = docker_service.create_container(
            name=payload.name,
            image=selected_image,
            cpu_limit=payload.cpu_limit,
            ram_limit_mb=payload.ram_limit_mb,
            volume_name=payload.volume_name,
            volume_mount_path=payload.volume_mount_path,
            network_name=payload.network_name or "bridge",
            labels={
                "template_type": payload.template_type,
                "expiration": str(expires_at) if expires_at else "none"
            }
        )
    except Exception as e:
        # Record failed activity
        log = ActivityLog(
            environment_name=payload.name,
            action="create_container",
            status="error",
            details=f"Failed to create Docker container: {e}"
        )
        db.add(log)
        db.commit()
        raise HTTPException(status_code=500, detail=f"Failed to create Docker container: {str(e)}")

    # 5. Save to database
    env = Environment(
        name=payload.name,
        container_id=container.id,
        template_type=payload.template_type,
        image=selected_image,
        image_tag=payload.image_tag,
        status="running",
        cpu_limit=payload.cpu_limit,
        ram_limit_mb=payload.ram_limit_mb,
        created_at=datetime.datetime.utcnow(),
        expires_at=expires_at,
        auto_cleanup=payload.auto_cleanup,
        description=payload.description or template_config.get("description", ""),
        volume_name=payload.volume_name,
        volume_mount_path=payload.volume_mount_path,
        network_name=payload.network_name or "bridge"
    )
    db.add(env)
    db.flush()

    # 6. Record success activity log
    log = ActivityLog(
        environment_id=env.id,
        environment_name=env.name,
        action="create_container",
        status="success",
        details=f"Real Docker container '{env.name}' ({container.short_id}) created with {payload.ram_limit_mb}MB RAM, {payload.cpu_limit} CPU."
    )
    db.add(log)
    db.commit()
    db.refresh(env)

    resp = EnvironmentResponse.model_validate(env)
    resp.remaining_seconds = _calculate_remaining_seconds(env.expires_at)
    return resp

@router.get("/{env_id}", response_model=EnvironmentResponse)
def get_environment(env_id: int, db: Session = Depends(get_db)):
    env = db.query(Environment).filter(Environment.id == env_id).first()
    if not env:
        raise HTTPException(status_code=404, detail="Environment not found")
    
    # Sync status
    if env.container_id:
        try:
            c = docker_service.get_container(env.container_id)
            if c:
                env.status = c.status
                db.commit()
        except Exception:
            pass

    resp = EnvironmentResponse.model_validate(env)
    resp.remaining_seconds = _calculate_remaining_seconds(env.expires_at)
    return resp

@router.delete("/{env_id}")
def delete_environment(env_id: int, db: Session = Depends(get_db)):
    env = db.query(Environment).filter(Environment.id == env_id).first()
    if not env:
        raise HTTPException(status_code=404, detail="Environment not found")

    # Stop and delete container
    if env.container_id:
        try:
            docker_service.delete_container(env.container_id, force=True)
        except Exception as e:
            # If already gone from docker, proceed with DB deletion
            pass

    # Record log
    log = ActivityLog(
        environment_name=env.name,
        action="delete_environment",
        status="success",
        details=f"Environment '{env.name}' and container {env.container_id[:12] if env.container_id else 'N/A'} deleted. Volumes preserved."
    )
    db.add(log)
    db.delete(env)
    db.commit()
    return {"message": f"Environment '{env.name}' deleted successfully."}

@router.post("/{env_id}/start")
def start_environment(env_id: int, db: Session = Depends(get_db)):
    env = db.query(Environment).filter(Environment.id == env_id).first()
    if not env:
        raise HTTPException(status_code=404, detail="Environment not found")
    
    # If container_id is present, try starting it
    if env.container_id:
        try:
            docker_service.start_container(env.container_id)
            env.status = "running"
            db.add(ActivityLog(environment_id=env.id, environment_name=env.name, action="start_container", status="success", details="Container started."))
            db.commit()
            return {"message": "Container started successfully"}
        except Exception as e:
            # Container might have been removed or expired, re-create below
            pass

    # Re-create / Relaunch container if expired or missing
    try:
        # First ensure old container with same name is cleaned up if leftover
        try:
            old_c = docker_service.get_client().containers.get(env.name)
            old_c.remove(force=True)
        except Exception:
            pass

        container = docker_service.create_container(
            name=env.name,
            image=env.image,
            cpu_limit=env.cpu_limit,
            ram_limit_mb=env.ram_limit_mb,
            volume_name=env.volume_name,
            volume_mount_path=env.volume_mount_path,
            network_name=env.network_name or "bridge",
            labels={"template_type": env.template_type}
        )
        env.container_id = container.id
        env.status = "running"
        if env.auto_cleanup:
            env.expires_at = datetime.datetime.utcnow() + datetime.timedelta(minutes=60)
        db.add(ActivityLog(
            environment_id=env.id,
            environment_name=env.name,
            action="relaunch_container",
            status="success",
            details=f"Container '{env.name}' ({container.short_id}) relaunched and started."
        ))
        db.commit()
        return {"message": "Container relaunched and started successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start/relaunch container: {str(e)}")

@router.post("/{env_id}/stop")
def stop_environment(env_id: int, db: Session = Depends(get_db)):
    env = db.query(Environment).filter(Environment.id == env_id).first()
    if not env or not env.container_id:
        raise HTTPException(status_code=404, detail="Environment or container not found")
    try:
        docker_service.stop_container(env.container_id)
        env.status = "exited"
        db.add(ActivityLog(environment_id=env.id, environment_name=env.name, action="stop_container", status="success", details="Container stopped."))
        db.commit()
        return {"message": "Container stopped successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{env_id}/restart")
def restart_environment(env_id: int, db: Session = Depends(get_db)):
    env = db.query(Environment).filter(Environment.id == env_id).first()
    if not env or not env.container_id:
        raise HTTPException(status_code=404, detail="Environment or container not found")
    try:
        docker_service.restart_container(env.container_id)
        env.status = "running"
        db.add(ActivityLog(environment_id=env.id, environment_name=env.name, action="restart_container", status="success", details="Container restarted."))
        db.commit()
        return {"message": "Container restarted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{env_id}/pause")
def pause_environment(env_id: int, db: Session = Depends(get_db)):
    env = db.query(Environment).filter(Environment.id == env_id).first()
    if not env or not env.container_id:
        raise HTTPException(status_code=404, detail="Environment or container not found")
    try:
        docker_service.pause_container(env.container_id)
        env.status = "paused"
        db.add(ActivityLog(environment_id=env.id, environment_name=env.name, action="pause_container", status="success", details="Container paused."))
        db.commit()
        return {"message": "Container paused successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{env_id}/unpause")
def unpause_environment(env_id: int, db: Session = Depends(get_db)):
    env = db.query(Environment).filter(Environment.id == env_id).first()
    if not env or not env.container_id:
        raise HTTPException(status_code=404, detail="Environment or container not found")
    try:
        docker_service.unpause_container(env.container_id)
        env.status = "running"
        db.add(ActivityLog(environment_id=env.id, environment_name=env.name, action="unpause_container", status="success", details="Container unpaused."))
        db.commit()
        return {"message": "Container resumed successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{env_id}/extend")
def extend_environment(env_id: int, minutes: int = Query(30, ge=5, le=1440), db: Session = Depends(get_db)):
    env = db.query(Environment).filter(Environment.id == env_id).first()
    if not env:
        raise HTTPException(status_code=404, detail="Environment not found")
    
    current_expiry = env.expires_at or datetime.datetime.utcnow()
    new_expiry = current_expiry + datetime.timedelta(minutes=minutes)
    env.expires_at = new_expiry
    db.add(ActivityLog(
        environment_id=env.id,
        environment_name=env.name,
        action="extend_lifetime",
        status="success",
        details=f"Extended lifetime by {minutes} minutes. New expiration: {new_expiry.isoformat()}."
    ))
    db.commit()
    return {"message": f"Environment extended by {minutes} minutes.", "expires_at": new_expiry.isoformat()}

@router.get("/{env_id}/stats", response_model=EnvironmentStats)
def get_environment_stats(env_id: int, db: Session = Depends(get_db)):
    env = db.query(Environment).filter(Environment.id == env_id).first()
    if not env or not env.container_id:
        raise HTTPException(status_code=404, detail="Environment or container not found")
    stats = docker_service.get_container_stats(env.container_id)
    return stats

@router.get("/{env_id}/logs")
def get_environment_logs(env_id: int, tail: int = Query(200, ge=10, le=2000), db: Session = Depends(get_db)):
    env = db.query(Environment).filter(Environment.id == env_id).first()
    if not env or not env.container_id:
        raise HTTPException(status_code=404, detail="Environment or container not found")
    logs = docker_service.get_container_logs(env.container_id, tail=tail)
    return {"logs": logs}

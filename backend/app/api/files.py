import os
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import Response
from sqlalchemy.orm import Session
from backend.app.database.database import get_db
from backend.app.models.models import Environment, ActivityLog
from backend.app.schemas.schemas import FileListResponse, FileCreateRequest, FolderCreateRequest
from backend.app.docker.docker_service import docker_service

router = APIRouter(prefix="/environments/{env_id}/files", tags=["File Manager"])

@router.get("", response_model=FileListResponse)
def list_container_files(env_id: int, path: str = Query("/", min_length=1), db: Session = Depends(get_db)):
    env = db.query(Environment).filter(Environment.id == env_id).first()
    if not env or not env.container_id:
        raise HTTPException(status_code=404, detail="Environment or container not found")
    
    try:
        items = docker_service.list_files(env.container_id, path)
        return {"current_path": path, "items": items}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list directory contents: {str(e)}")

@router.get("/download")
def download_container_file(env_id: int, path: str = Query(..., min_length=1), db: Session = Depends(get_db)):
    env = db.query(Environment).filter(Environment.id == env_id).first()
    if not env or not env.container_id:
        raise HTTPException(status_code=404, detail="Environment or container not found")

    try:
        content = docker_service.read_file(env.container_id, path)
        filename = os.path.basename(path) or "download"
        return Response(
            content=content,
            media_type="application/octet-stream",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to download file: {str(e)}")

@router.post("/upload")
async def upload_container_file(
    env_id: int,
    path: str = Query("/", description="Destination directory in container"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    env = db.query(Environment).filter(Environment.id == env_id).first()
    if not env or not env.container_id:
        raise HTTPException(status_code=404, detail="Environment or container not found")

    try:
        content = await file.read()
        target_path = f"{path.rstrip('/')}/{file.filename}"
        docker_service.write_file(env.container_id, target_path, content)
        
        db.add(ActivityLog(
            environment_id=env.id,
            environment_name=env.name,
            action="upload_file",
            status="success",
            details=f"Uploaded '{file.filename}' ({len(content)} bytes) to container path '{target_path}'."
        ))
        db.commit()
        return {"message": f"File '{file.filename}' uploaded successfully to '{target_path}'"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")

@router.post("/create")
def create_container_file(env_id: int, payload: FileCreateRequest, db: Session = Depends(get_db)):
    env = db.query(Environment).filter(Environment.id == env_id).first()
    if not env or not env.container_id:
        raise HTTPException(status_code=404, detail="Environment or container not found")

    try:
        docker_service.write_file(env.container_id, payload.path, payload.content.encode("utf-8"))
        db.add(ActivityLog(
            environment_id=env.id,
            environment_name=env.name,
            action="create_file",
            status="success",
            details=f"Created file at '{payload.path}' inside container."
        ))
        db.commit()
        return {"message": f"File '{payload.path}' created successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create file: {str(e)}")

@router.post("/folder")
def create_container_folder(env_id: int, payload: FolderCreateRequest, db: Session = Depends(get_db)):
    env = db.query(Environment).filter(Environment.id == env_id).first()
    if not env or not env.container_id:
        raise HTTPException(status_code=404, detail="Environment or container not found")

    try:
        docker_service.create_directory(env.container_id, payload.path)
        db.add(ActivityLog(
            environment_id=env.id,
            environment_name=env.name,
            action="create_folder",
            status="success",
            details=f"Created directory '{payload.path}' inside container."
        ))
        db.commit()
        return {"message": f"Folder '{payload.path}' created successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create directory: {str(e)}")

@router.delete("")
def delete_container_file(env_id: int, path: str = Query(..., min_length=1), db: Session = Depends(get_db)):
    env = db.query(Environment).filter(Environment.id == env_id).first()
    if not env or not env.container_id:
        raise HTTPException(status_code=404, detail="Environment or container not found")

    # Safety check: prevent deleting root or critical paths
    if path.strip() in ["/", "/bin", "/boot", "/dev", "/etc", "/lib", "/lib64", "/proc", "/sys", "/usr"]:
        raise HTTPException(status_code=400, detail="Deletion of core system root directories is prohibited.")

    try:
        docker_service.delete_file(env.container_id, path)
        db.add(ActivityLog(
            environment_id=env.id,
            environment_name=env.name,
            action="delete_file",
            status="success",
            details=f"Deleted '{path}' inside container."
        ))
        db.commit()
        return {"message": f"Item '{path}' deleted successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete item: {str(e)}")

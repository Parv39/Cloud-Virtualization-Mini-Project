from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from backend.app.docker.docker_service import docker_service

router = APIRouter(prefix="/images", tags=["Docker Images"])

@router.get("")
def list_images():
    try:
        return docker_service.list_images()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/pull")
def pull_image(image_name: str = Query(..., min_length=1), tag: str = Query("latest")):
    try:
        docker_service.pull_image(image_name, tag)
        return {"message": f"Successfully pulled image '{image_name}:{tag}'"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to pull image: {str(e)}")

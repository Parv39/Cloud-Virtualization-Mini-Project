import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Depends
from sqlalchemy.orm import Session
from backend.app.database.database import get_db
from backend.app.models.models import Environment
from backend.app.terminal.terminal_service import TerminalSession
from backend.app.docker.docker_service import docker_service

router = APIRouter(prefix="/environments", tags=["Terminal"])
logger = logging.getLogger("dvem.terminal_api")

@router.websocket("/{env_id}/terminal")
async def terminal_websocket_endpoint(websocket: WebSocket, env_id: int):
    await websocket.accept()
    
    # Verify environment exists in database
    db = next(get_db())
    env = db.query(Environment).filter(Environment.id == env_id).first()
    if not env or not env.container_id:
        await websocket.send_text("\r\n\x1b[31m[Error]: Environment or container not found.\x1b[0m\r\n")
        await websocket.close()
        return

    # Check container is actually running
    container = docker_service.get_container(env.container_id)
    if not container:
        await websocket.send_text("\r\n\x1b[31m[Error]: Container does not exist on Docker host.\x1b[0m\r\n")
        await websocket.close()
        return

    if container.status != "running":
        await websocket.send_text(f"\r\n\x1b[33m[Warning]: Container is currently '{container.status}'. Starting container...\x1b[0m\r\n")
        try:
            container.start()
        except Exception as e:
            await websocket.send_text(f"\r\n\x1b[31m[Error]: Failed to start container: {e}\x1b[0m\r\n")
            await websocket.close()
            return

    session = TerminalSession(env.container_id, websocket)
    await session.start()

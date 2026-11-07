from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.app.database.database import get_db
from backend.app.models.models import ActivityLog
from backend.app.schemas.schemas import ActivityLogResponse

router = APIRouter(prefix="/activity", tags=["Activity Logs"])

@router.get("", response_model=List[ActivityLogResponse])
def get_activity_logs(limit: int = Query(50, ge=1, le=500), db: Session = Depends(get_db)):
    logs = db.query(ActivityLog).order_by(desc(ActivityLog.timestamp)).limit(limit).all()
    return [ActivityLogResponse.model_validate(l) for l in logs]

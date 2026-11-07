import asyncio
import datetime
import logging
from backend.app.core.config import settings
from backend.app.database.database import SessionLocal
from backend.app.models.models import Environment, ActivityLog
from backend.app.docker.docker_service import docker_service

logger = logging.getLogger("dvem.cleanup")

class CleanupScheduler:
    def __init__(self):
        self._running = False
        self._task = None

    def start(self):
        if not self._running:
            self._running = True
            self._task = asyncio.create_task(self._cleanup_loop())
            logger.info("Automatic environment cleanup background task started.")

    def stop(self):
        self._running = False
        if self._task:
            self._task.cancel()
            logger.info("Automatic environment cleanup background task stopped.")

    async def _cleanup_loop(self):
        while self._running:
            try:
                await self.check_and_cleanup_expired()
            except Exception as e:
                logger.error(f"Error during cleanup execution: {e}")
            await asyncio.sleep(settings.CLEANUP_CHECK_INTERVAL_SECONDS)

    async def check_and_cleanup_expired(self):
        db = SessionLocal()
        try:
            now = datetime.datetime.utcnow()
            # Find active environments where auto_cleanup is True and expired
            expired_envs = db.query(Environment).filter(
                Environment.auto_cleanup == True,
                Environment.expires_at != None,
                Environment.expires_at <= now,
                Environment.status != "expired"
            ).all()

            for env in expired_envs:
                logger.info(f"Environment '{env.name}' (ID: {env.id}) has expired. Removing container...")
                
                # Clean up actual Docker container
                if env.container_id:
                    try:
                        docker_service.delete_container(env.container_id, force=True)
                    except Exception as ce:
                        logger.warning(f"Error removing expired container {env.container_id}: {ce}")

                env.status = "expired"
                env.container_id = None
                
                # Record Activity Log
                log = ActivityLog(
                    environment_id=env.id,
                    environment_name=env.name,
                    action="auto_cleanup",
                    status="success",
                    details=f"Environment '{env.name}' automatically expired and container was cleanly removed. Attached volumes were preserved."
                )
                db.add(log)
            
            db.commit()
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to process expired environments: {e}")
        finally:
            db.close()

cleanup_scheduler = CleanupScheduler()

import os
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
DATA_DIR = BASE_DIR / "data"
LOGS_DIR = BASE_DIR / "logs"
BACKUPS_DIR = BASE_DIR / "backups"

DATA_DIR.mkdir(parents=True, exist_ok=True)
LOGS_DIR.mkdir(parents=True, exist_ok=True)
BACKUPS_DIR.mkdir(parents=True, exist_ok=True)

class Settings(BaseSettings):
    PROJECT_NAME: str = "Disposable Virtual Environment Manager (DVEM)"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    # Storage & DB
    DATABASE_URL: str = f"sqlite:///{DATA_DIR / 'dvem.db'}"
    DATA_PATH: Path = DATA_DIR
    LOGS_PATH: Path = LOGS_DIR
    BACKUPS_PATH: Path = BACKUPS_DIR
    
    # Docker
    DOCKER_MANAGED_LABEL_KEY: str = "managed_by"
    DOCKER_MANAGED_LABEL_VALUE: str = "DVEM"
    
    # Defaults
    DEFAULT_RAM_MB: int = 512
    DEFAULT_CPU_LIMIT: float = 0.5
    DEFAULT_EXPIRATION_MINUTES: int = 60
    CLEANUP_CHECK_INTERVAL_SECONDS: int = 30
    
    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "*"
    ]

    class Config:
        case_sensitive = True

settings = Settings()

import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database.database import Base

class Environment(Base):
    __tablename__ = "environments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    container_id = Column(String(100), unique=True, index=True, nullable=True)
    template_type = Column(String(50), nullable=False, default="ubuntu")
    image = Column(String(255), nullable=False)
    image_tag = Column(String(50), nullable=False, default="latest")
    status = Column(String(50), nullable=False, default="creating")
    cpu_limit = Column(Float, nullable=False, default=0.5)
    ram_limit_mb = Column(Integer, nullable=False, default=512)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    auto_cleanup = Column(Boolean, default=True)
    description = Column(Text, nullable=True)
    volume_name = Column(String(100), nullable=True)
    volume_mount_path = Column(String(255), nullable=True, default="/data")
    network_name = Column(String(100), nullable=True, default="bridge")

class PersistentVolume(Base):
    __tablename__ = "persistent_volumes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    docker_volume_name = Column(String(150), unique=True, nullable=False)
    mount_path = Column(String(255), nullable=False, default="/data")
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class DockerNetwork(Base):
    __tablename__ = "docker_networks"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    docker_network_id = Column(String(100), unique=True, nullable=False)
    driver = Column(String(50), nullable=False, default="bridge")
    subnet = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    environment_id = Column(Integer, nullable=True)
    environment_name = Column(String(100), nullable=True)
    action = Column(String(100), nullable=False)
    status = Column(String(50), nullable=False, default="success") # success, error, warning
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

class ApplicationSetting(Base):
    __tablename__ = "application_settings"

    key = Column(String(100), primary_key=True, index=True)
    value = Column(Text, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

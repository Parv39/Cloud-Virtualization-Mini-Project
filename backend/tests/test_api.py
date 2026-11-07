import time
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database.database import engine, Base

client = TestClient(app)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    yield

def test_health_check():
    response = client.get("/api/system/health")
    assert response.status_code == 200
    data = response.json()
    assert data["docker_connected"] is True
    assert data["status"] == "healthy"

def test_docker_info():
    response = client.get("/api/system/docker")
    assert response.status_code == 200
    data = response.json()
    assert "version" in data
    assert data["arch"] == "x86_64"

def test_host_monitoring():
    response = client.get("/api/monitoring/host")
    assert response.status_code == 200
    data = response.json()
    assert "cpu_percent" in data
    assert "total_ram_gb" in data
    assert data["docker_status"] == "Online"

def test_volume_lifecycle():
    vol_name = f"test_vol_{int(time.time())}"
    # Create volume
    res_create = client.post("/api/volumes", json={"name": vol_name, "mount_path": "/data", "description": "Test Volume"})
    assert res_create.status_code == 201
    vol_data = res_create.json()
    vol_id = vol_data["id"]
    
    # List volumes
    res_list = client.get("/api/volumes")
    assert res_list.status_code == 200
    assert any(v["id"] == vol_id for v in res_list.json())

    # Delete volume
    res_del = client.delete(f"/api/volumes/{vol_id}")
    assert res_del.status_code == 200

def test_environment_lifecycle():
    env_name = f"test_env_{int(time.time())}"
    # 1. Create real environment
    res_create = client.post("/api/environments", json={
        "name": env_name,
        "template_type": "ubuntu",
        "cpu_limit": 0.5,
        "ram_limit_mb": 512,
        "expiration_minutes": 15,
        "auto_cleanup": True
    })
    assert res_create.status_code == 201
    env_data = res_create.json()
    env_id = env_data["id"]
    container_id = env_data["container_id"]
    assert env_data["status"] == "running"
    assert container_id is not None

    try:
        # 2. Get environment details
        res_get = client.get(f"/api/environments/{env_id}")
        assert res_get.status_code == 200
        assert res_get.json()["name"] == env_name

        # 3. Create a file inside container
        res_file = client.post(f"/api/environments/{env_id}/files/create", json={
            "path": "/test_lifecycle.txt",
            "content": "Lifecycle test content"
        })
        assert res_file.status_code == 200

        # 4. List files inside container
        res_files = client.get(f"/api/environments/{env_id}/files?path=/")
        assert res_files.status_code == 200
        items = res_files.json()["items"]
        assert any(item["name"] == "test_lifecycle.txt" for item in items)

        # 5. Stop environment
        res_stop = client.post(f"/api/environments/{env_id}/stop")
        assert res_stop.status_code == 200

        # 6. Start environment
        res_start = client.post(f"/api/environments/{env_id}/start")
        assert res_start.status_code == 200

    finally:
        # 7. Delete environment
        res_delete = client.delete(f"/api/environments/{env_id}")
        assert res_delete.status_code == 200

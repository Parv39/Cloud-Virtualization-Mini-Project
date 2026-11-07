import subprocess
import time
import urllib.request
import json
import sys

def probe_server():
    print("Launching DVEM Uvicorn Server on http://127.0.0.1:8000...")
    proc = subprocess.Popen(
        ["backend\\.venv\\Scripts\\python.exe", "-m", "uvicorn", "backend.app.main:app", "--host", "127.0.0.1", "--port", "8000"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    time.sleep(3)
    
    try:
        # Probe 1: Health check
        with urllib.request.urlopen("http://127.0.0.1:8000/api/system/health") as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print(f"Health Probe (Status {resp.status}): {data}")
            assert data.get("status") == "healthy"
            assert data.get("docker_connected") is True

        # Probe 2: Templates
        with urllib.request.urlopen("http://127.0.0.1:8000/api/system/templates") as resp:
            templates = json.loads(resp.read().decode("utf-8"))
            print(f"Templates Probe: Available runtimes = {list(templates.keys())}")

        # Probe 3: SPA Frontend HTML
        with urllib.request.urlopen("http://127.0.0.1:8000/") as resp:
            html = resp.read().decode("utf-8")
            print(f"Frontend SPA Probe (Status {resp.status}): Successfully served index.html ({len(html)} bytes)")
            assert "<title>DVEM" in html

        print("\n>>> ALL PROBES PASSED! THE APPLICATION IS 100% READY TO RUN! <<<")
        return True
    except Exception as e:
        print(f"Probe failed: {e}", file=sys.stderr)
        return False
    finally:
        print("Stopping probe server process...")
        proc.terminate()
        try:
            proc.wait(timeout=3)
        except subprocess.TimeoutExpired:
            proc.kill()

if __name__ == "__main__":
    ok = probe_server()
    sys.exit(0 if ok else 1)

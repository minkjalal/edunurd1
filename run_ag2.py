"""
Anti Gravity 2.0 — Unified Cross-Platform Project Runner
=========================================================
Concurrently manages:
1. FastAPI Epistemic Dual-Agent Backend on http://localhost:8000
2. EduNerd Express Frontend on http://localhost:3000

Includes:
- Automatic port conflict resolution
- Graceful parent/child process termination
- Automatic frontend bundle verification
"""

# Connection: run_ag2.py is part of the runtime flow documented in CODEBASE_GUIDE.md.
# Function: Starts the FastAPI backend and EduNerd frontend together and shuts them down as one unit.

from __future__ import annotations

import os
import signal
import subprocess
import sys
import time
from pathlib import Path

# Configure UTF-8 for Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Paths
BASE_DIR = Path(__file__).resolve().parent
BACKEND_DIR = BASE_DIR / "backend"

def kill_process_on_port(port: int) -> None:
    """Find and terminate any process listening on the specified port (Windows)."""
    if sys.platform != "win32":
        return
    try:
        cmd = f'netstat -ano | findstr :{port}'
        output = subprocess.check_output(cmd, shell=True, text=True, stderr=subprocess.DEVNULL)
        for line in output.strip().split("\n"):
            parts = [p for p in line.strip().split() if p]
            if len(parts) >= 5 and "LISTENING" in parts:
                pid = parts[-1]
                if pid and pid != "0":
                    print(f"[Cleanup] Terminating stale PID {pid} on port {port}...")
                    subprocess.run(f"taskkill /F /PID {pid}", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception:
        pass

def main() -> None:
    print("\n" + "=" * 70)
    print("  ANTI GRAVITY 2.0 -- UNIFIED SYSTEM RUNNER")
    print("  Platform: EduNerd Frontend + Epistemic Engine Backend")
    print("  Workspace: " + str(BASE_DIR))
    print("=" * 70 + "\n")

    # 1. Clean ports
    print("[1/4] Clearing port conflicts on :8000 and :3000...")
    kill_process_on_port(8000)
    kill_process_on_port(3000)

    # 2. Build Frontend
    print("[2/4] Compiling frontend bundle with esbuild...")
    try:
        build_res = subprocess.run(["node", "build.js"], cwd=str(BASE_DIR), check=True)
        print("  ✓ Bundle generated successfully: public/bundle.js")
    except Exception as exc:
        print(f"  ❌ Frontend build failed: {exc}")
        sys.exit(1)

    # 3. Start Backend
    print("[3/4] Launching FastAPI Epistemic Backend on http://localhost:8000...")
    backend_env = os.environ.copy()
    backend_env["PORT"] = "8000"
    backend_env["OPENBLAS_NUM_THREADS"] = "1"
    
    backend_proc = subprocess.Popen(
        [sys.executable, "server.py"],
        cwd=str(BACKEND_DIR),
        env=backend_env
    )

    # 4. Start Frontend
    print("[4/4] Launching EduNerd Express Web Server on http://localhost:3000...")
    frontend_env = os.environ.copy()
    frontend_env["PORT"] = "3000"
    
    frontend_proc = subprocess.Popen(
        ["node", "server.js"],
        cwd=str(BASE_DIR),
        env=frontend_env
    )

    print("\n" + "=" * 70)
    print("  [SUCCESS] ANTI GRAVITY 2.0 IS LIVE!")
    print("  Web Interface:      http://localhost:3000")
    print("  FastAPI Backend:    http://localhost:8000")
    print("  Swagger API Docs:   http://localhost:8000/docs")
    print("  Health Check:       http://localhost:8000/api/health")
    print("=" * 70 + "\n")
    print("Press Ctrl+C to shut down all services gracefully.\n")

    def handle_shutdown(signum, frame):
        print("\n[Shutdown] Shutting down Anti Gravity 2.0 services...")
        try:
            frontend_proc.terminate()
            backend_proc.terminate()
        except Exception:
            pass
        kill_process_on_port(8000)
        kill_process_on_port(3000)
        print("[Shutdown] Completed cleanly.")
        sys.exit(0)

    signal.signal(signal.SIGINT, handle_shutdown)
    signal.signal(signal.SIGTERM, handle_shutdown)

    try:
        while True:
            time.sleep(1)
            # Check if either process died unexpectedly
            if backend_proc.poll() is not None:
                print(f"[Warning] Backend process exited with code {backend_proc.returncode}")
                break
            if frontend_proc.poll() is not None:
                print(f"[Warning] Frontend process exited with code {frontend_proc.returncode}")
                break
    except KeyboardInterrupt:
        handle_shutdown(None, None)

if __name__ == "__main__":
    main()

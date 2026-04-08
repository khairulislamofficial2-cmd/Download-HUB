"""
MediaSave -- One-Command Launcher
==================================
Run this single file to start the full stack:
  - Backend  -> FastAPI on http://localhost:8000
  - Frontend -> Next.js  on http://localhost:3000

Usage (from the project root):
  python start.py

Flags:
  --backend-only   Start only the FastAPI backend
  --frontend-only  Start only the Next.js frontend
  --port-api 8000  Override backend port (default 8000)
  --port-web 3000  Override frontend port (default 3000)
  --no-browser     Don't auto-open the browser on startup
"""

import argparse
import os
import platform
import shutil
import signal
import subprocess
import sys
import threading
import time
import webbrowser
from pathlib import Path

# ── Force UTF-8 output on Windows ────────────────────────────────────────────
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except AttributeError:
        pass

# ── Paths ─────────────────────────────────────────────────────────────────────
ROOT     = Path(__file__).parent.resolve()
BACKEND  = ROOT / "backend"
FRONTEND = ROOT / "frontend"

IS_WINDOWS = platform.system() == "Windows"

# ── ANSI colours ─────────────────────────────────────────────────────────────
class C:
    RESET  = "\033[0m"
    BOLD   = "\033[1m"
    RED    = "\033[91m"
    GREEN  = "\033[92m"
    YELLOW = "\033[93m"
    BLUE   = "\033[94m"
    VIOLET = "\033[95m"
    CYAN   = "\033[96m"
    GREY   = "\033[90m"

# Enable ANSI colours on Windows terminal
if IS_WINDOWS:
    os.system("")


def banner():
    """Print a safe ASCII banner that works on all Windows encodings."""
    print(f"""
{C.VIOLET}{C.BOLD}
  +---------------------------------------------------------+
  |   MediaSave  --  Video & Audio Downloader               |
  |   FastAPI backend  +  Next.js frontend  +  yt-dlp       |
  +---------------------------------------------------------+
{C.RESET}{C.GREY}  Powered by yt-dlp / FastAPI / Next.js
{C.RESET}""")


def log(prefix: str, color: str, msg: str):
    """Print a prefixed, coloured log line."""
    print(f"{color}{C.BOLD}[{prefix}]{C.RESET} {msg}", flush=True)


def err(prefix: str, msg: str):
    log(prefix, C.RED, msg)


# ── Dependency checks ─────────────────────────────────────────────────────────

def check_python():
    if sys.version_info < (3, 10):
        err("CHECK", f"Python 3.10+ required (found {sys.version})")
        sys.exit(1)
    log("CHECK", C.GREEN, f"Python {sys.version.split()[0]} OK")


def check_node():
    node = shutil.which("node")
    npm  = shutil.which("npm")
    if not node or not npm:
        err("CHECK", "Node.js / npm not found. Install from https://nodejs.org")
        sys.exit(1)
    try:
        ver = subprocess.check_output(["node", "--version"], text=True).strip()
        log("CHECK", C.GREEN, f"Node.js {ver} OK")
    except Exception:
        err("CHECK", "Could not determine Node.js version")


def check_ytdlp():
    if shutil.which("yt-dlp"):
        try:
            ver = subprocess.check_output(
                ["yt-dlp", "--version"], text=True, stderr=subprocess.DEVNULL
            ).strip()
            log("CHECK", C.GREEN, f"yt-dlp {ver} OK")
        except Exception:
            log("CHECK", C.YELLOW, "yt-dlp found but version check failed")
    else:
        log("CHECK", C.YELLOW, "yt-dlp not found -- attempting pip install...")
        subprocess.run(
            [sys.executable, "-m", "pip", "install", "-q", "--upgrade", "yt-dlp"],
            check=False,
        )
        if shutil.which("yt-dlp"):
            log("CHECK", C.GREEN, "yt-dlp installed OK")
        else:
            log("CHECK", C.YELLOW,
                "yt-dlp not on PATH yet. Restart shell or add Python scripts to PATH.")


def check_ffmpeg():
    if shutil.which("ffmpeg"):
        log("CHECK", C.GREEN, "ffmpeg OK")
    else:
        log("CHECK", C.YELLOW,
            "ffmpeg not found -- video merging / audio conversion will fail.\n"
            "         Download from https://ffmpeg.org/download.html and add to PATH.")


# ── Backend setup ─────────────────────────────────────────────────────────────

def setup_backend():
    """Create venv if needed, install requirements, copy .env."""
    log("BACKEND", C.BLUE, "Checking Python dependencies...")

    venv_dir = BACKEND / ".venv"

    if IS_WINDOWS:
        python_in_venv  = venv_dir / "Scripts" / "python.exe"
        pip_in_venv     = venv_dir / "Scripts" / "pip.exe"
        uvicorn_in_venv = venv_dir / "Scripts" / "uvicorn.exe"
    else:
        python_in_venv  = venv_dir / "bin" / "python"
        pip_in_venv     = venv_dir / "bin" / "pip"
        uvicorn_in_venv = venv_dir / "bin" / "uvicorn"

    # Create venv if it doesn't exist
    if not venv_dir.exists():
        log("BACKEND", C.BLUE, "Creating virtual environment in backend/.venv ...")
        subprocess.run(
            [sys.executable, "-m", "venv", str(venv_dir)],
            check=True,
        )
        log("BACKEND", C.GREEN, "Virtual environment created OK")

    # Install requirements
    req_file = BACKEND / "requirements.txt"
    if req_file.exists():
        log("BACKEND", C.BLUE, "Installing backend requirements (this may take a moment)...")
        subprocess.run(
            [str(pip_in_venv), "install", "-q", "-r", str(req_file)],
            check=True,
        )
        log("BACKEND", C.GREEN, "Python requirements installed OK")
    else:
        log("BACKEND", C.YELLOW, "requirements.txt not found -- skipping pip install")

    # Copy .env if missing
    env_example = BACKEND / ".env.example"
    env_file    = BACKEND / ".env"
    if not env_file.exists() and env_example.exists():
        import shutil as _sh
        _sh.copy(str(env_example), str(env_file))
        log("BACKEND", C.CYAN, "Created backend/.env from .env.example")

    return python_in_venv, uvicorn_in_venv


# ── Frontend setup ────────────────────────────────────────────────────────────

def setup_frontend():
    """Run npm install if node_modules is missing, copy .env.local."""
    node_modules = FRONTEND / "node_modules"
    if not node_modules.exists():
        log("FRONTEND", C.VIOLET, "node_modules not found -- running npm install (may take a while)...")
        subprocess.run(
            ["npm", "install"],
            cwd=str(FRONTEND),
            check=True,
            shell=IS_WINDOWS,
        )
        log("FRONTEND", C.GREEN, "npm packages installed OK")
    else:
        log("FRONTEND", C.GREEN, "node_modules OK")

    # Copy .env.local if missing
    env_example = FRONTEND / ".env.local.example"
    env_file    = FRONTEND / ".env.local"
    if not env_file.exists() and env_example.exists():
        import shutil as _sh
        _sh.copy(str(env_example), str(env_file))
        log("FRONTEND", C.CYAN, "Created frontend/.env.local from .env.local.example")


# ── Subprocess output streaming ───────────────────────────────────────────────

def stream_output(proc: subprocess.Popen, prefix: str, color: str):
    """Read lines from a subprocess and forward them with a coloured prefix."""
    assert proc.stdout is not None
    try:
        for raw in iter(proc.stdout.readline, b""):
            line = raw.decode("utf-8", errors="replace").rstrip()
            if line:
                print(f"{color}{C.BOLD}[{prefix}]{C.RESET} {line}", flush=True)
    except Exception:
        pass


# ── Main launcher ─────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="MediaSave full-stack launcher")
    parser.add_argument("--backend-only",  action="store_true",
                        help="Start only the FastAPI backend")
    parser.add_argument("--frontend-only", action="store_true",
                        help="Start only the Next.js frontend")
    parser.add_argument("--port-api", default="8000",
                        help="Backend port (default: 8000)")
    parser.add_argument("--port-web", default="3000",
                        help="Frontend port (default: 3000)")
    parser.add_argument("--no-browser", action="store_true",
                        help="Don't open browser automatically")
    args = parser.parse_args()

    banner()

    run_backend  = not args.frontend_only
    run_frontend = not args.backend_only

    # ── Pre-flight checks ──────────────────────────────────────────────────
    log("CHECK", C.CYAN, "Running pre-flight checks...")
    check_python()
    if run_frontend:
        check_node()
    check_ytdlp()
    check_ffmpeg()
    print()

    # ── Setup ──────────────────────────────────────────────────────────────
    processes: list[subprocess.Popen] = []
    threads:   list[threading.Thread] = []

    uvicorn_bin = None
    if run_backend:
        _python_bin, uvicorn_bin = setup_backend()
        print()

    if run_frontend:
        setup_frontend()
        print()

    # ── Graceful shutdown handler ──────────────────────────────────────────
    def shutdown(sig=None, frame=None):
        print()
        log("SYSTEM", C.YELLOW, "Shutting down all services...")
        for p in processes:
            try:
                p.terminate()
            except Exception:
                try:
                    p.kill()
                except Exception:
                    pass
        # Wait briefly for processes to exit
        for p in processes:
            try:
                p.wait(timeout=5)
            except Exception:
                pass
        log("SYSTEM", C.GREEN, "All services stopped. Goodbye!")
        sys.exit(0)

    signal.signal(signal.SIGINT,  shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    # ── Start backend ──────────────────────────────────────────────────────
    if run_backend:
        backend_cmd = [
            str(_python_bin),
            str(BACKEND / "run.py"),
            args.port_api,
        ]

        log("BACKEND", C.BLUE,
            f"Starting FastAPI on http://localhost:{args.port_api} ...")

        backend_proc = subprocess.Popen(
            backend_cmd,
            cwd=str(BACKEND),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
        )
        processes.append(backend_proc)

        t = threading.Thread(
            target=stream_output,
            args=(backend_proc, "BACKEND", C.BLUE),
            daemon=True,
        )
        t.start()
        threads.append(t)

        # Give the backend a moment to bind its port
        time.sleep(2)

    # ── Start frontend ─────────────────────────────────────────────────────
    if run_frontend:
        frontend_cmd = ["npm", "run", "dev", "--", "--port", args.port_web]

        log("FRONTEND", C.VIOLET,
            f"Starting Next.js on http://localhost:{args.port_web} ...")

        frontend_proc = subprocess.Popen(
            frontend_cmd,
            cwd=str(FRONTEND),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            shell=IS_WINDOWS,
        )
        processes.append(frontend_proc)

        t = threading.Thread(
            target=stream_output,
            args=(frontend_proc, "FRONTEND", C.VIOLET),
            daemon=True,
        )
        t.start()
        threads.append(t)

    # ── Print ready banner ─────────────────────────────────────────────────
    time.sleep(3)
    print()
    print(f"{C.GREEN}{C.BOLD}" + "-" * 55)
    print(f"  MediaSave is running!")
    if run_backend:
        print(f"  Backend  API  ->  http://localhost:{args.port_api}")
        print(f"  API Docs      ->  http://localhost:{args.port_api}/docs")
    if run_frontend:
        print(f"  Frontend App  ->  http://localhost:{args.port_web}")
    print(f"  Press  Ctrl+C  to stop all services")
    print("-" * 55 + C.RESET)
    print()

    # Auto-open browser
    if run_frontend and not args.no_browser:
        time.sleep(2)
        try:
            webbrowser.open(f"http://localhost:{args.port_web}")
        except Exception:
            pass

    # ── Keep alive – watch for unexpected exits ────────────────────────────
    try:
        while True:
            for p in processes:
                if p.poll() is not None:
                    err("SYSTEM",
                        f"A service exited unexpectedly (code {p.returncode}). "
                        "Shutting down...")
                    shutdown()
            time.sleep(1)
    except KeyboardInterrupt:
        shutdown()


if __name__ == "__main__":
    main()

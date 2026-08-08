"""
backend/api.py — FastAPI application entrypoint (now resides inside the backend folder).

Responsibilities:
  • Create the FastAPI app
  • Include the router defined in backend/routes.py
  • Serve the React build from ../frontend/dist (relative to this file)
  • Configure CORS for the Vite dev server (port 5173)

Run from the repository root:
    cd backend && python api.py

Or simply double‑click the provided start_backend.bat script.
"""
from __future__ import annotations

import sys
import warnings
from pathlib import Path

# Suppress noisy warnings from gerbonara (if any)
warnings.filterwarnings("ignore")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

# Ensure the project root is on the PYTHONPATH so that the package works
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

# Import the router that lives in the same package
from backend.routes import router

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------
app = FastAPI(
    title="PCB Gerber Analyzer",
    description="Parses Gerber ZIP files and returns PCB specifications as JSON.",
    version="1.0.0",
)

# Allow the Vite dev server (http://localhost:5173) to call the API during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register the API routes defined in backend/routes.py
app.include_router(router)

# ---------------------------------------------------------------------------
# Serve the React production build (frontend/dist)
# ---------------------------------------------------------------------------
# The static files live one level up from this file: ../frontend/dist
DIST = PROJECT_ROOT / "frontend" / "dist"

if DIST.exists():
    # Serve assets (JS/CSS) under /assets – Vite builds them there
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/")
    def serve_index():
        return FileResponse(DIST / "index.html")

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        """Catch‑all route for React Router client‑side navigation."""
        return FileResponse(DIST / "index.html")

# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.api:app", host="0.0.0.0", port=8000, reload=True)

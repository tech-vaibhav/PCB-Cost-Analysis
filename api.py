"""
api.py — FastAPI application entrypoint.

Responsibilities:
  - Create the FastAPI app
  - Mount the router from backend/routes.py
  - Serve the React frontend static build (frontend/dist)
  - Configure CORS for development (Vite on port 5173)

Run:
    python api.py
    or:
    uvicorn api:app --reload --port 8000
"""
from __future__ import annotations

import sys
import warnings
from pathlib import Path

# Suppress gerbonara library noise before any imports
warnings.filterwarnings("ignore")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

# Add project root to path so `backend` package resolves correctly
sys.path.insert(0, str(Path(__file__).parent))

# Import the router from the backend package
from backend.routes import router

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------
app = FastAPI(
    title="PCB Gerber Analyzer",
    description="Parses Gerber ZIP files and returns PCB specifications as JSON.",
    version="1.0.0",
)

# CORS — allow Vite dev server during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes from backend/routes.py
app.include_router(router)

# ---------------------------------------------------------------------------
# Serve React frontend (production build)
# ---------------------------------------------------------------------------
DIST = Path(__file__).parent / "frontend" / "dist"

if DIST.exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/")
    def serve_index():
        return FileResponse(DIST / "index.html")

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        """Catch-all for React Router client-side navigation."""
        index = DIST / "index.html"
        return FileResponse(index)

# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)

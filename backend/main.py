import sys
import warnings
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))
warnings.filterwarnings("ignore")  # gerbonara is noisy

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from backend.core.settings import settings
from backend.core.supabase import SupabaseError
from backend.routers import admin, auth, gerber, pricing
from backend.services.pricing.store import ConfigUnavailable, load_config

app = FastAPI(title="PCB Quote API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_methods=["*"],
    allow_headers=["*"],
)
for r in (gerber, pricing, auth, admin):
    app.include_router(r.router)


@app.exception_handler(SupabaseError)
def supabase_error(_, exc: SupabaseError):
    return JSONResponse({"detail": str(exc)}, status_code=502)


@app.exception_handler(ConfigUnavailable)
def config_unavailable(_, exc):
    return JSONResponse({"detail": f"Pricing config is not available: {exc}"[:300]}, status_code=503)


@app.get("/api/health")
def health():
    try:
        load_config()
        return {"ok": True, "pricing": "ok"}
    except ConfigUnavailable:
        return {"ok": True, "pricing": "unavailable"}


DIST = PROJECT_ROOT / "frontend" / "dist"
if DIST.exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def spa(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(404)
        return FileResponse(DIST / "index.html")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)

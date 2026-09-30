"""
backend/routes/printer_3d.py
-----------------------------
FastAPI router for the 3D file parser service.

Routes:
    POST /api/3d/parse  — accepts .stp / .step (and later .stl, .obj, .3mf),
                          returns extracted geometry & metadata as JSON.
    POST /api/3d/price  — stub for future pricing (not yet implemented).
"""
from __future__ import annotations

import csv
import logging
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from backend.services.printer_3d_parser import parse_3d_file

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/3d", tags=["3d-printer"])

# Supported file extensions
SUPPORTED_EXTENSIONS = {".stp", ".step"}   # extend as we add more parsers

# Max file size: 200 MB (3D files can be large)
MAX_FILE_SIZE = 200 * 1024 * 1024


# ---------------------------------------------------------------------------
# POST /api/3d/parse
# ---------------------------------------------------------------------------
@router.post("/parse")
async def parse_3d(file: UploadFile = File(...)):
    """
    Accept a 3D model file and return all extracted geometry & metadata as JSON.

    Fields returned:
        file_info.filename          → original filename
        file_info.size_bytes        → file size
        file_info.format            → STEP | STL | OBJ | 3MF
        file_info.encoding          → ASCII | Binary | null

        geometry.volume_cm3         → volume in cm³
        geometry.surface_area_cm2   → surface area in cm²

        dimensions.length_mm        → X bounding box span
        dimensions.width_mm         → Y bounding box span
        dimensions.height_mm        → Z bounding box span
        dimensions.bbox_*           → individual min/max per axis

        mesh_stats.solid_count      → number of solid bodies
        mesh_stats.shell_count      → number of shells
        mesh_stats.face_count       → number of faces
        mesh_stats.edge_count       → number of edges
        mesh_stats.vertex_count     → number of vertices
        mesh_stats.compound_parts   → top-level parts in assembly

        raw_metadata                → format-specific extra fields
        warnings[]                  → any parse/geometry issues
    """
    # ── Input validation ────────────────────────────────────────────────────
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided.")

    ext = Path(file.filename).suffix.lower()
    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported file type '{ext}'. "
                f"Supported: {', '.join(sorted(SUPPORTED_EXTENSIONS))}"
            )
        )

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(raw) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds the {MAX_FILE_SIZE // (1024*1024)} MB limit."
        )

    # ── Parse ────────────────────────────────────────────────────────────────
    try:
        result = parse_3d_file(raw, filename=file.filename)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("3D parser error for file '%s'", file.filename)
        raise HTTPException(
            status_code=500,
            detail=f"Parser error: {exc}"
        ) from exc

    # ── CSV export (mirrors the Gerber service pattern) ───────────────────────
    try:
        results_dir = Path(__file__).parent.parent / "results"
        results_dir.mkdir(exist_ok=True)
        csv_path = results_dir / f"3d_{Path(file.filename).stem}.csv"
        with csv_path.open("w", newline="", encoding="utf-8") as csvfile:
            writer = csv.writer(csvfile)
            writer.writerow(["key", "value"])

            def _flatten(prefix: str, obj):
                if isinstance(obj, dict):
                    for k, v in obj.items():
                        _flatten(f"{prefix}{k}.", v)
                elif isinstance(obj, list):
                    for i, item in enumerate(obj):
                        _flatten(f"{prefix}{i}.", item)
                else:
                    writer.writerow([prefix.rstrip("."), obj])

            _flatten("", result.model_dump())
    except Exception:
        logger.exception("Failed to write CSV for '%s'", file.filename)

    # ── Response ─────────────────────────────────────────────────────────────
    return JSONResponse(content=result.model_dump())


# ---------------------------------------------------------------------------
# POST /api/3d/price  (stub — pricing logic TBD)
# ---------------------------------------------------------------------------
@router.post("/price")
async def price_3d():
    """
    3D print cost estimation — not yet implemented.
    Pricing logic will be added once the material/process parameters are defined.
    """
    raise HTTPException(
        status_code=501,
        detail="3D pricing is not yet implemented. Parse first and share the fields."
    )

"""
backend/routes.py
-----------------
FastAPI router that exposes the Gerber parser as a service.

Route:
    POST /api/parse  — accepts a Gerber ZIP, runs the parser service,
                       returns all extracted values as JSON key-value pairs.

The parser (gerber_parser.py) is the service layer.
This file is the API layer — it only handles HTTP concerns.
"""
from __future__ import annotations

import logging
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from backend.gerber_parser import parse_gerber_zip
from backend.pricing_engine import calculate_price


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["gerber"])


# ---------------------------------------------------------------------------
# POST /api/parse
# ---------------------------------------------------------------------------
@router.post("/parse")
async def parse_gerber(file: UploadFile = File(...)):
    """
    Accept a Gerber ZIP file, run it through the parser service, and return
    all extracted PCB specifications as a flat JSON key-value response.

    Auto-filled fields returned (consumed by the React frontend):
        dimensions.width_mm       → Board Length input
        dimensions.height_mm      → Board Width input
        dimensions.area_cm2       → Info display
        copper_layer_count        → Layers toggle
        drill.total_holes         → Drill info display
        drill.min_drill_mm        → Min drill display
        drill.max_drill_mm        → Max drill display
        drill.drill_sizes_mm      → Drill sizes display
        has_top_silkscreen        → Silkscreen badge
        has_bottom_silkscreen     → Silkscreen badge
        has_top_soldermask        → Solder mask badge
        has_bottom_soldermask     → Solder mask badge
        has_outline               → Outline detected badge
        layers[]                  → Layer summary table
    """
    # ── Input validation ────────────────────────────────────────────────────
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided.")

    ext = Path(file.filename).suffix.lower()
    if ext not in (".zip", ".rar", ".7z"):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Please upload a .zip file."
        )

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(raw) > 50 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File exceeds the 50 MB limit.")

    # ── Service call: parse the Gerber ZIP ──────────────────────────────────
    try:
        result = parse_gerber_zip(raw, filename=file.filename)
        # ---- CSV export ----
        try:
            import csv
            results_dir = Path(__file__).parent / "results"
            results_dir.mkdir(exist_ok=True)
            csv_path = results_dir / f"{Path(file.filename).stem}.csv"
            with csv_path.open('w', newline='', encoding='utf-8') as csvfile:
                writer = csv.writer(csvfile)
                writer.writerow(["key", "value"])  # header
                # Flatten result dict (including nested dicts) for CSV output
                def flatten(prefix, obj):
                    if isinstance(obj, dict):
                        for k, v in obj.items():
                            flatten(f"{prefix}{k}." if prefix else f"{k}.", v)
                    elif isinstance(obj, list):
                        for i, item in enumerate(obj):
                            flatten(f"{prefix}{i}.", item)
                    else:
                        writer.writerow([prefix.rstrip('.'), obj])
                flatten('', result.model_dump())
        except Exception as csv_err:
            logger.exception("Failed to write CSV for %s", file.filename)

    except Exception as exc:
        logger.exception("Parser error for file '%s'", file.filename)
        raise HTTPException(
            status_code=500,
            detail=f"Parser error: {exc}"
        ) from exc

    # ── Return full result as JSON ──────────────────────────────────────────
    # model_dump() gives us all fields as a plain dict — exactly like the CSV
    # export but delivered over HTTP as key-value pairs.
    return JSONResponse(content=result.model_dump())


# ---------------------------------------------------------------------------
# POST /api/price  — calculate fabrication cost
# ---------------------------------------------------------------------------
from pydantic import BaseModel

class PriceRequest(BaseModel):
    length_mm: float
    width_mm: float
    quantity: int
    material: str = "FR-4"
    thickness: str = "1.6"
    micro: str = "35 micro"


@router.post("/price")
def price_endpoint(req: PriceRequest):
    """
    Calculate PCB fabrication cost from board specs.

    Returns 48hr and 7WD pricing (total + per-piece).
    """
    result = calculate_price(
        length_mm=req.length_mm,
        width_mm=req.width_mm,
        quantity=req.quantity,
        material=req.material,
        thickness=req.thickness,
        micro=req.micro,
    )

    if result is None:
        raise HTTPException(
            status_code=400,
            detail="Invalid inputs: length, width and quantity must be greater than 0."
        )

    return JSONResponse(content={
        "express_48hr": {
            "total": result.cost_48hr_total,
            "single": result.cost_48hr_single,
        },
        "standard_7wd": {
            "total": result.cost_7wd_total,
            "single": result.cost_7wd_single,
        },
        "breakdown": {
            "area_used_mm2":    result.area_used_mm2,
            "area_waste_mm2":   result.area_waste_mm2,
            "rate_used":        result.rate_used,
            "rate_waste":       result.rate_waste,
            "micro_factor":     result.micro_factor,
            "pieces_per_column":result.pieces_per_column,
            "columns_needed":   result.columns_needed,
        }
    })


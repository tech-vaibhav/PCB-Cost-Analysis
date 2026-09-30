"""
backend/services/printer_3d_parser.py
--------------------------------------
3D file parser service — currently supports STP/STEP via CadQuery.

Extracted data (best-effort per format):
  file_info    — filename, size_bytes, format, encoding
  geometry     — volume_cm3, surface_area_cm2
  dimensions   — length_mm, width_mm, height_mm (bounding box)
  mesh_stats   — solid_count, face_count, edge_count, vertex_count, shell_count
  topology     — compound parts
  warnings     — any parse/geometry issues
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Response schema
# ---------------------------------------------------------------------------

class FileInfo(BaseModel):
    filename: str
    size_bytes: int
    format: str                        # "STEP", "STL", "OBJ", "3MF"
    encoding: str | None = None        # "ASCII" | "Binary" | None


class Geometry(BaseModel):
    volume_cm3: float | None = None
    surface_area_cm2: float | None = None


class Dimensions(BaseModel):
    length_mm: float | None = None     # X span
    width_mm:  float | None = None     # Y span
    height_mm: float | None = None     # Z span
    bbox_xmin: float | None = None
    bbox_ymin: float | None = None
    bbox_zmin: float | None = None
    bbox_xmax: float | None = None
    bbox_ymax: float | None = None
    bbox_zmax: float | None = None


class MeshStats(BaseModel):
    solid_count:    int | None = None
    shell_count:    int | None = None
    face_count:     int | None = None
    edge_count:     int | None = None
    vertex_count:   int | None = None
    compound_parts: int | None = None


class Printer3DResult(BaseModel):
    file_info:    FileInfo
    geometry:     Geometry
    dimensions:   Dimensions
    mesh_stats:   MeshStats
    raw_metadata: dict[str, Any] = Field(default_factory=dict)
    warnings:     list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _mm3_to_cm3(val: float) -> float:
    return val / 1000.0


def _mm2_to_cm2(val: float) -> float:
    return val / 100.0


def _safe_round(val: float | None, n: int = 4) -> float | None:
    if val is None:
        return None
    return round(val, n)


# ---------------------------------------------------------------------------
# STP / STEP parser  (CadQuery + OCC)
# ---------------------------------------------------------------------------

def _parse_step(raw: bytes, filename: str) -> Printer3DResult:
    """Parse a STEP/STP file using CadQuery and extract all geometry metadata."""
    import tempfile
    import os

    warns: list[str] = []

    # Write raw bytes to a temp file — CadQuery needs a real filesystem path
    suffix = Path(filename).suffix.lower()
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(raw)
        tmp_path = tmp.name

    try:
        import cadquery as cq
        from OCP.BRepGProp import BRepGProp
        from OCP.GProp import GProp_GProps
        from OCP.TopExp import TopExp_Explorer
        from OCP.TopAbs import (
            TopAbs_SOLID, TopAbs_SHELL, TopAbs_FACE,
            TopAbs_EDGE, TopAbs_VERTEX,
        )

        # ── Load ──────────────────────────────────────────────────────────
        result = cq.importers.importStep(tmp_path)
        shape  = result.val()        # CadQuery wrapper (Compound / Solid / …)
        occ    = shape.wrapped       # raw TopoDS_Shape for OCP-level APIs

        # ── Bounding box ──────────────────────────────────────────────────
        bbox      = shape.BoundingBox()
        length_mm = _safe_round(bbox.xlen)
        width_mm  = _safe_round(bbox.ylen)
        height_mm = _safe_round(bbox.zlen)

        # ── Volume ────────────────────────────────────────────────────────
        volume_cm3: float | None = None
        try:
            vp = GProp_GProps()
            BRepGProp.VolumeProperties_s(occ, vp)
            volume_cm3 = _safe_round(_mm3_to_cm3(abs(vp.Mass())))
        except Exception as exc:
            warns.append(f"Volume computation failed: {exc}")

        # ── Surface area ──────────────────────────────────────────────────
        surface_cm2: float | None = None
        try:
            sp = GProp_GProps()
            BRepGProp.SurfaceProperties_s(occ, sp)
            surface_cm2 = _safe_round(_mm2_to_cm2(abs(sp.Mass())))
        except Exception as exc:
            warns.append(f"Surface area computation failed: {exc}")

        # ── Topology counts ───────────────────────────────────────────────
        def _count(topo_type) -> int:
            exp = TopExp_Explorer(occ, topo_type)
            n = 0
            while exp.More():
                n += 1
                exp.Next()
            return n

        solid_count  = _count(TopAbs_SOLID)
        shell_count  = _count(TopAbs_SHELL)
        face_count   = _count(TopAbs_FACE)
        edge_count   = _count(TopAbs_EDGE)
        vertex_count = _count(TopAbs_VERTEX)

        # CadQuery compound children (top-level parts in an assembly)
        compound_parts: int | None = None
        try:
            compound_parts = len(result.vals())
        except Exception:
            pass

        # ── Shape type string ─────────────────────────────────────────────
        try:
            shape_type_int = int(occ.ShapeType())
            shape_type_map = {
                0: "COMPOUND", 1: "COMPSOLID", 2: "SOLID",
                3: "SHELL", 4: "FACE", 5: "WIRE",
                6: "EDGE", 7: "VERTEX", 8: "SHAPE",
            }
            shape_type_str = shape_type_map.get(shape_type_int, str(shape_type_int))
        except Exception:
            shape_type_str = "UNKNOWN"

        raw_meta: dict[str, Any] = {
            "shape_type": shape_type_str,
            "bbox_raw": {
                "xmin": _safe_round(bbox.xmin),
                "xmax": _safe_round(bbox.xmax),
                "ymin": _safe_round(bbox.ymin),
                "ymax": _safe_round(bbox.ymax),
                "zmin": _safe_round(bbox.zmin),
                "zmax": _safe_round(bbox.zmax),
            },
        }

    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

    return Printer3DResult(
        file_info=FileInfo(
            filename=filename,
            size_bytes=len(raw),
            format="STEP",
            encoding=None,
        ),
        geometry=Geometry(
            volume_cm3=volume_cm3,
            surface_area_cm2=surface_cm2,
        ),
        dimensions=Dimensions(
            length_mm=length_mm,
            width_mm=width_mm,
            height_mm=height_mm,
            bbox_xmin=_safe_round(bbox.xmin),
            bbox_ymin=_safe_round(bbox.ymin),
            bbox_zmin=_safe_round(bbox.zmin),
            bbox_xmax=_safe_round(bbox.xmax),
            bbox_ymax=_safe_round(bbox.ymax),
            bbox_zmax=_safe_round(bbox.zmax),
        ),
        mesh_stats=MeshStats(
            solid_count=solid_count,
            shell_count=shell_count,
            face_count=face_count,
            edge_count=edge_count,
            vertex_count=vertex_count,
            compound_parts=compound_parts,
        ),
        raw_metadata=raw_meta,
        warnings=warns,
    )


# ---------------------------------------------------------------------------
# Public dispatcher
# ---------------------------------------------------------------------------

def parse_3d_file(raw: bytes, filename: str) -> Printer3DResult:
    """
    Dispatch to the correct parser based on file extension.
    Raises ValueError for unsupported formats.

    Currently supported:
        .stp, .step  → CadQuery / OpenCASCADE

    Planned:
        .stl         → trimesh
        .obj         → trimesh
        .3mf         → trimesh + zipfile
    """
    ext = Path(filename).suffix.lower()

    if ext in (".stp", ".step"):
        return _parse_step(raw, filename)

    raise ValueError(
        f"Unsupported format '{ext}'. "
        "Currently supported: .stp, .step"
    )

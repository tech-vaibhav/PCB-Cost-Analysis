"""
gerber_parser.py
================
RS-274X Gerber ZIP parser built on top of gerbonara.

What this module does
---------------------
1. Accepts an in-memory ZIP file (bytes / BytesIO).
2. Uses gerbonara.LayerStack.open_zip() to auto-detect and parse all layers.
3. Walks every graphic layer and drill file to extract:
   - Board dimensions (from outline, fallback to bounding-box)
   - Per-layer RS-274X metadata: units, coordinate format, aperture breakdown,
     flash / draw / region counts, polarity
   - Drill summary: hole count, PTH vs NPTH, diameter list
4. Returns a fully-populated ParsedGerberResult Pydantic model.

RS-274X concepts mapped to gerbonara objects
--------------------------------------------
  %MO MM*%  / %MO IN*%     →  layer.import_settings.unit (MM / Inch)
  %FS LA X26 Y26*%         →  layer.import_settings (integer/decimal digits)
  %ADD<n>C,<dia>*%         →  CircleAperture
  %ADD<n>R,<x>X<y>*%       →  RectangleAperture
  %ADD<n>O,<x>X<y>*%       →  ObroundAperture
  %ADD<n>P,...*%            →  PolygonAperture
  %AM...*%  + %ADD<n><name>*%  →  ApertureMacroInstance
  D01 (draw/arc)            →  Line, Arc objects
  D03 (flash)               →  Flash objects
  G36/G37 (region fill)     →  Region objects
  %LPC*%                    →  polarity_dark=False on any object in the layer
  Excellon drill file       →  ExcellonFile (.drill_sizes(), .hit_count(), .is_plated())
"""

from __future__ import annotations

import logging
import re
import tempfile
import traceback
import zipfile
from io import BytesIO
from pathlib import Path
from typing import Optional

from gerbonara import LayerStack
from gerbonara.apertures import (
    CircleAperture,
    RectangleAperture,
    ObroundAperture,
    PolygonAperture,
    ApertureMacroInstance,
)
from gerbonara.graphic_objects import Line, Arc, Flash, Region
from gerbonara.rs274x import GerberFile
from gerbonara.excellon import ExcellonFile
from gerbonara.utils import MM

from .models import (
    ApertureSummary,
    BoardDimensions,
    DrillInfo,
    GerberUnit,
    LayerInfo,
    LayerSide,
    LayerType,
    ParsedGerberResult,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

# gerbonara uses (side, use) tuple keys like ('top', 'copper'), ('bottom', 'mask') …
# Map those to our LayerType / LayerSide enums.

_USE_TO_LAYER_TYPE: dict[str, LayerType] = {
    "copper":    LayerType.COPPER,
    "mask":      LayerType.SOLDERMASK,
    "silk":      LayerType.SILKSCREEN,
    "paste":     LayerType.PASTE,
    "outline":   LayerType.OUTLINE,
    "mechanical outline": LayerType.OUTLINE,
}

_SIDE_TO_LAYER_SIDE: dict[str, LayerSide] = {
    "top":        LayerSide.TOP,
    "bottom":     LayerSide.BOTTOM,
    "inner":      LayerSide.INNER,
    "mechanical": LayerSide.BOTH,
}


def _layer_side(side_str: str) -> Optional[LayerSide]:
    """Convert gerbonara side string to LayerSide enum."""
    return _SIDE_TO_LAYER_SIDE.get(side_str.lower())


def _layer_type(use_str: str) -> LayerType:
    """Convert gerbonara use string to LayerType enum."""
    return _USE_TO_LAYER_TYPE.get(use_str.lower(), LayerType.OTHER)


def _human_name(side: str, use: str) -> str:
    """Build a readable layer name like 'Top Copper', 'Bottom Mask', etc."""
    return f"{side.capitalize()} {use.capitalize()}"


def _unit_from_settings(import_settings) -> GerberUnit:
    """Extract unit (MM/INCH) from gerbonara FileSettings."""
    if import_settings is None:
        return GerberUnit.UNKNOWN
    unit = getattr(import_settings, "unit", None)
    if unit is None:
        return GerberUnit.UNKNOWN
    unit_name = str(unit).upper()
    if "MM" in unit_name or "METRIC" in unit_name:
        return GerberUnit.MM
    if "IN" in unit_name or "INCH" in unit_name or "IMPERIAL" in unit_name:
        return GerberUnit.INCH
    return GerberUnit.UNKNOWN


def _coord_format(import_settings) -> Optional[str]:
    """
    Produce a human-readable coordinate format string from %FS statement.
    gerbonara stores integer/decimal digit counts in FileSettings.
    Example output: "LAX 2.6 Y 2.6"
    """
    if import_settings is None:
        return None
    try:
        xi = getattr(import_settings, "number_format", None)
        if xi is None:
            return None
        # number_format is a tuple (integer_digits, decimal_digits)
        return f"LAX {xi[0]}.{xi[1]} Y {xi[0]}.{xi[1]}"
    except Exception:
        return None


def _aperture_summary(gerber_file) -> ApertureSummary:
    """
    Walk all apertures used in a GerberFile and tally by type.
    RS-274X aperture types: C (Circle), R (Rectangle), O (Obround/Oval),
    P (Polygon), Macro (ApertureMacroInstance).
    """
    summary = ApertureSummary()
    try:
        for ap in gerber_file.apertures():
            summary.total += 1
            if isinstance(ap, CircleAperture):
                summary.circles += 1
            elif isinstance(ap, RectangleAperture):
                summary.rectangles += 1
            elif isinstance(ap, ObroundAperture):
                summary.ovals += 1
            elif isinstance(ap, PolygonAperture):
                summary.polygons += 1
            elif isinstance(ap, ApertureMacroInstance):
                summary.macros += 1
    except Exception as exc:
        logger.debug("aperture_summary error: %s", exc)
    return summary


def _object_counts(gerber_file):
    """
    Count RS-274X drawing operations from the object list:
      Flash  → D03 (pad, via, through-hole flash)
      Line   → D01 straight interpolation
      Arc    → D01 arc interpolation (G02/G03)
      Region → G36/G37 (copper pour / polygon fill)

    Also detects clear-polarity objects (from %LPC*%).
    Returns (flash_count, draw_count, region_count, has_clear_polarity).
    """
    flashes = draws = regions = 0
    has_clear = False
    try:
        for obj in gerber_file.objects:
            # Polarity check — any object with polarity_dark=False came from %LPC*%
            if hasattr(obj, "polarity_dark") and not obj.polarity_dark:
                has_clear = True

            if isinstance(obj, Flash):
                flashes += 1
            elif isinstance(obj, Region):
                regions += 1
            elif isinstance(obj, (Line, Arc)):
                draws += 1
    except Exception as exc:
        logger.debug("object_counts error: %s", exc)
    return flashes, draws, regions, has_clear


# ---------------------------------------------------------------------------
# Per graphic-layer parsing
# ---------------------------------------------------------------------------

def _parse_graphic_layer(
    side_str: str,
    use_str: str,
    gerber_file,
) -> LayerInfo:
    """Parse one GerberFile layer and return a LayerInfo model."""

    filename = ""
    try:
        if gerber_file.original_path:
            filename = str(gerber_file.original_path.name)
    except Exception:
        pass

    units = _unit_from_settings(gerber_file.import_settings)
    coord_fmt = _coord_format(gerber_file.import_settings)
    apertures = _aperture_summary(gerber_file)
    flashes, draws, regions, has_clear = _object_counts(gerber_file)

    return LayerInfo(
        name=_human_name(side_str, use_str),
        filename=filename,
        layer_type=_layer_type(use_str),
        side=_layer_side(side_str),
        units=units,
        coord_format=coord_fmt,
        flash_count=flashes,
        draw_count=draws,
        region_count=regions,
        aperture_summary=apertures,
        has_clear_polarity=has_clear,
    )


# ---------------------------------------------------------------------------
# Drill file parsing
# ---------------------------------------------------------------------------

def _parse_drill_files(stack: LayerStack) -> DrillInfo:
    """
    Aggregate drill info from all Excellon files in the LayerStack.
    gerbonara splits drill files into PTH (drill_pth), NPTH (drill_npth),
    and any additional drill_layers.
    """
    total = 0
    pth_count = 0
    npth_count = 0
    all_sizes: set[float] = set()

    def _process(drill_file, label: str):
        nonlocal total, pth_count, npth_count
        if drill_file is None or drill_file.is_empty:
            return
        try:
            sizes = drill_file.drill_sizes(unit=MM)
            all_sizes.update(round(s, 4) for s in sizes if s > 0)

            hit_counts = drill_file.hit_count()
            hits = sum(hit_counts.values())
            total += hits

            if drill_file.is_plated:
                pth_count += hits
            elif drill_file.is_nonplated:
                npth_count += hits
            else:
                # Mixed or unknown — count all as PTH (conservative estimate)
                pth_count += hits

            logger.debug("  %s: %d hits, sizes=%s", label, hits, sizes)
        except Exception as exc:
            logger.debug("drill parse error (%s): %s", label, exc)

    _process(stack.drill_pth, "PTH drill")
    _process(stack.drill_npth, "NPTH drill")
    for i, dl in enumerate(stack._drill_layers):
        _process(dl, f"extra drill layer {i}")

    sorted_sizes = sorted(all_sizes)
    return DrillInfo(
        total_holes=total,
        through_holes=pth_count,
        vias=0,          # via identification requires netlist; set 0 for now
        min_drill_mm=sorted_sizes[0] if sorted_sizes else None,
        max_drill_mm=sorted_sizes[-1] if sorted_sizes else None,
        drill_sizes_mm=sorted_sizes,
    )


# ---------------------------------------------------------------------------
# Board dimensions
# ---------------------------------------------------------------------------

def _parse_dimensions(stack: LayerStack) -> Optional[BoardDimensions]:
    """
    Extract board dimensions in mm.
    Tries board outline first (most accurate), falls back to full bounding box.
    """
    try:
        bounds = stack.board_bounds(unit=MM)
        source = "outline" if stack.outline else "bounding_box"
        if bounds is None:
            return None
        (x_min, y_min), (x_max, y_max) = bounds
        w = round(x_max - x_min, 4)
        h = round(y_max - y_min, 4)
        area = round((w * h) / 100, 4)   # mm² → cm²
        return BoardDimensions(
            width_mm=w,
            height_mm=h,
            area_cm2=area,
            source=source,
        )
    except Exception as exc:
        logger.warning("Could not extract board dimensions: %s", exc)
        return None


# ---------------------------------------------------------------------------
# Stack-up flags
# ---------------------------------------------------------------------------

def _copper_layer_count(stack: LayerStack) -> int:
    """Count distinct copper layers — determines board type (1L, 2L, 4L…)."""
    try:
        return len(stack.copper_layers)
    except Exception:
        return 0


def _layer_present(stack: LayerStack, side: str, use: str) -> bool:
    """Return True if the given (side, use) layer exists and is non-empty."""
    try:
        layer = stack.graphic_layers.get((side, use))
        if layer is None:
            return False
        return not layer.is_empty
    except Exception:
        return False


# ---------------------------------------------------------------------------
# Altium / non-standard filename classifier (fallback)
# ---------------------------------------------------------------------------

# Ordered rules: (side, use, regex-pattern-on-lowercased-stem)
# First match wins.
_ALTIUM_RULES: list[tuple[str, str, str]] = [
    # Copper signal layers
    ("top",    "copper",  r"(copper.*top|signal.*top|f[._]cu|gtl)"),
    ("bottom", "copper",  r"(copper.*bot|signal.*bot|b[._]cu|gbl)"),
    # Pads are part of copper (Altium separates them)
    ("top",    "copper",  r"pads.*top"),
    ("bottom", "copper",  r"pads.*bot"),
    # Silkscreen / legend
    ("top",    "silk",    r"(legend.*top|silk.*top|f[._]silks|gto)"),
    ("bottom", "silk",    r"(legend.*bot|silk.*bot|b[._]silks|gbo)"),
    # Soldermask
    ("top",    "mask",    r"(soldermask.*top|mask.*top|f[._]mask|gts)"),
    ("bottom", "mask",    r"(soldermask.*bot|mask.*bot|b[._]mask|gbs)"),
    # Paste
    ("top",    "paste",   r"(paste.*top|f[._]paste|gtp)"),
    ("bottom", "paste",   r"(paste.*bot|b[._]paste|gbp)"),
    # Board outline / edge cuts
    ("mechanical", "outline", r"(profile|edge.*cut|board.*outline|gko|outline|keepout|keep.out)"),
    # Mechanical / fab layers (skip — not needed for costing)
    ("mechanical", "other",   r"mechanical"),
]


def _classify_altium(stem: str) -> tuple[str, str] | None:
    """
    Return (side, use) for a Gerber file based on its filename stem,
    or None if we cannot classify it.
    """
    s = stem.lower().replace(" ", "_")
    for side, use, pattern in _ALTIUM_RULES:
        if re.search(pattern, s):
            return side, use
    return None


def _fallback_parse_zip(
    zip_bytes: bytes,
    filename: str,
    warnings: list[str],
) -> tuple[list[LayerInfo], DrillInfo, Optional[BoardDimensions], dict]:
    """
    Manual fallback for ZIPs whose filenames gerbonara cannot auto-map.
    Opens each .gbr file individually via GerberFile, classifies by filename,
    and builds the layer list ourselves.

    Returns (layer_infos, drill_info, dimensions, flags_dict).
    """
    layer_infos: list[LayerInfo] = []
    drill_total = drill_pth = 0
    all_drill_sizes: set[float] = set()
    seen: dict[tuple[str, str], int] = {}   # (side, use) -> count, for dedup

    # Stack-up flags
    flags: dict[str, bool] = {
        "has_top_copper": False, "has_bottom_copper": False,
        "has_top_silkscreen": False, "has_bottom_silkscreen": False,
        "has_top_soldermask": False, "has_bottom_soldermask": False,
        "has_top_paste": False, "has_bottom_paste": False,
        "has_outline": False, "has_drill": False,
    }

    # Bounding-box tracking for board dimensions
    x_min = y_min = float("inf")
    x_max = y_max = float("-inf")
    has_bounds = False

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp = Path(tmpdir)

        # Extract entire ZIP to temp dir first (GerberFile.open needs real paths)
        with zipfile.ZipFile(BytesIO(zip_bytes)) as zf:
            zf.extractall(tmp)

        for fpath in tmp.iterdir():
            stem   = fpath.stem
            suffix = fpath.suffix.lower()
            name   = fpath.name

            # --- Excellon drill files ---
            if suffix in (".drl", ".txt", ".exc", ".xln") or re.search(
                r"\.(drl|exc|xln|drill)$", name, re.IGNORECASE
            ):
                try:
                    ef = ExcellonFile.open(fpath)
                    if not ef.is_empty:
                        sizes = ef.drill_sizes(unit=MM)
                        all_drill_sizes.update(round(s, 4) for s in sizes if s > 0)
                        hits = sum(ef.hit_count().values())
                        drill_total += hits
                        drill_pth += hits
                        flags["has_drill"] = True
                        logger.debug("Drill '%s': %d hits", name, hits)
                except Exception as exc:
                    logger.debug("Skipping drill '%s': %s", name, exc)
                continue

            # --- Gerber graphic layers ---
            if suffix not in (".gbr", ".ger", ".gtl", ".gbl", ".gts", ".gbs",
                               ".gto", ".gbo", ".gtp", ".gbp", ".gko"):
                continue

            classification = _classify_altium(stem)
            if classification is None:
                logger.debug("Cannot classify '%s' -- skipping", name)
                warnings.append(f"Unrecognised layer skipped: {name}")
                continue

            side_str, use_str = classification

            # Deduplicate: keep first match unless copper (inner layers OK)
            key = (side_str, use_str)
            seen[key] = seen.get(key, 0) + 1
            if seen[key] > 1 and use_str != "copper":
                logger.debug("Duplicate (%s, %s) for '%s' -- skipping", side_str, use_str, name)
                continue

            try:
                gf = GerberFile.open(fpath)

                # Bounding box
                try:
                    bounds = gf.bounding_box(unit=MM)
                    if bounds:
                        (bx0, by0), (bx1, by1) = bounds
                        x_min = min(x_min, bx0); y_min = min(y_min, by0)
                        x_max = max(x_max, bx1); y_max = max(y_max, by1)
                        has_bounds = True
                except Exception:
                    pass

                info = _parse_graphic_layer(side_str, use_str, gf)
                info = info.model_copy(update={"filename": name})
                layer_infos.append(info)

                # Update flags
                if side_str == "top"    and use_str == "copper": flags["has_top_copper"]        = True
                if side_str == "bottom" and use_str == "copper": flags["has_bottom_copper"]     = True
                if side_str == "top"    and use_str == "silk":   flags["has_top_silkscreen"]    = True
                if side_str == "bottom" and use_str == "silk":   flags["has_bottom_silkscreen"] = True
                if side_str == "top"    and use_str == "mask":   flags["has_top_soldermask"]    = True
                if side_str == "bottom" and use_str == "mask":   flags["has_bottom_soldermask"] = True
                if side_str == "top"    and use_str == "paste":  flags["has_top_paste"]         = True
                if side_str == "bottom" and use_str == "paste":  flags["has_bottom_paste"]      = True
                if use_str == "outline":                         flags["has_outline"]           = True

                logger.debug("Parsed '%s' as (%s, %s)", name, side_str, use_str)
            except Exception as exc:
                logger.warning("Could not parse '%s': %s", name, exc)
                warnings.append(f"Could not parse layer {name}: {exc}")

    # Build DrillInfo
    sorted_sizes = sorted(all_drill_sizes)
    drill_info = DrillInfo(
        total_holes=drill_total,
        through_holes=drill_pth,
        vias=0,
        min_drill_mm=sorted_sizes[0] if sorted_sizes else None,
        max_drill_mm=sorted_sizes[-1] if sorted_sizes else None,
        drill_sizes_mm=sorted_sizes,
    )
    flags["has_drill"] = drill_total > 0

    # Build BoardDimensions
    dims: Optional[BoardDimensions] = None
    if has_bounds and x_max > x_min and y_max > y_min:
        w = round(x_max - x_min, 4)
        h = round(y_max - y_min, 4)
        dims = BoardDimensions(
            width_mm=w,
            height_mm=h,
            area_cm2=round((w * h) / 100, 4),
            source="bounding_box",
        )

    return layer_infos, drill_info, dims, flags


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def parse_gerber_zip(
    zip_bytes: bytes,
    filename: str = "upload.zip",
) -> ParsedGerberResult:
    """
    Parse a Gerber ZIP file and return a structured ParsedGerberResult.

    Parameters
    ----------
    zip_bytes : bytes
        Raw bytes of the uploaded ZIP file.
    filename : str
        Original filename (used for display only, not I/O).

    Returns
    -------
    ParsedGerberResult
        Fully populated result model. The ``errors`` list will be non-empty
        if parsing failed at a high level; ``warnings`` may carry
        non-fatal issues.
    """
    result = ParsedGerberResult(filename=filename)
    warnings: list[str] = []
    errors: list[str] = []

    # ------------------------------------------------------------------ #
    # 1. Parse with gerbonara — with fallback for non-standard filenames  #
    # ------------------------------------------------------------------ #
    stack = None
    use_fallback = False
    try:
        buf = BytesIO(zip_bytes)
        stack = LayerStack.open_zip(buf, original_path=filename)
        logger.info("Parsed ZIP '%s': board_name=%s generator=%s",
                    filename, stack.board_name, stack.generator)
    except (ValueError, SystemError) as exc:
        # gerbonara couldn't auto-map the layer names (e.g. Altium export)
        logger.warning(
            "LayerStack.open_zip failed for '%s' (%s) — switching to fallback parser.",
            filename, exc,
        )
        warnings.append(
            f"Standard layer detection failed ({exc}); using filename-based fallback."
        )
        use_fallback = True
    except Exception as exc:
        logger.exception("Fatal: could not parse Gerber ZIP '%s'", filename)
        errors.append(f"Failed to parse ZIP: {exc}")
        result.errors = errors
        return result

    # ------------------------------------------------------------------ #
    # 1b. Fallback path — parse layer-by-layer from ZIP                   #
    # ------------------------------------------------------------------ #
    if use_fallback:
        layer_infos, drill_info, dims, flags = _fallback_parse_zip(
            zip_bytes, filename, warnings
        )
        result.layers        = layer_infos
        result.layer_count   = len(layer_infos)
        result.drill         = drill_info
        result.dimensions    = dims
        result.has_drill     = flags["has_drill"]
        result.has_top_copper           = flags["has_top_copper"]
        result.has_bottom_copper        = flags["has_bottom_copper"]
        result.has_top_silkscreen       = flags["has_top_silkscreen"]
        result.has_bottom_silkscreen    = flags["has_bottom_silkscreen"]
        result.has_top_soldermask       = flags["has_top_soldermask"]
        result.has_bottom_soldermask    = flags["has_bottom_soldermask"]
        result.has_top_paste            = flags["has_top_paste"]
        result.has_bottom_paste         = flags["has_bottom_paste"]
        result.has_outline              = flags["has_outline"]
        result.copper_layer_count = sum(
            1 for li in layer_infos if li.layer_type == LayerType.COPPER
        )
        result.has_inner_copper = any(
            li.side not in (LayerSide.TOP, LayerSide.BOTTOM)
            for li in layer_infos
            if li.layer_type == LayerType.COPPER
        )
        if not result.has_drill:
            warnings.append("No drill hits found — ZIP may be missing Excellon drill files.")
        if not result.has_top_copper and not result.has_bottom_copper:
            warnings.append("No copper layers detected.")
        result.warnings = warnings
        result.errors   = errors
        return result

    # ------------------------------------------------------------------ #
    # 2. Board dimensions                                                  #
    # ------------------------------------------------------------------ #
    result.dimensions = _parse_dimensions(stack)
    if result.dimensions is None:
        warnings.append(
            "Could not determine board dimensions — no outline or bounding box found."
        )

    # ------------------------------------------------------------------ #
    # 3. Walk graphic layers                                               #
    # ------------------------------------------------------------------ #
    layer_infos: list[LayerInfo] = []

    for (side_str, use_str), gerber_file in stack.graphic_layers.items():
        try:
            if gerber_file is None:
                continue
            info = _parse_graphic_layer(side_str, use_str, gerber_file)
            layer_infos.append(info)
            logger.debug("Layer (%s, %s): flashes=%d draws=%d regions=%d",
                         side_str, use_str,
                         info.flash_count, info.draw_count, info.region_count)
        except Exception as exc:
            msg = f"Error parsing layer ({side_str}, {use_str}): {exc}"
            logger.warning(msg)
            warnings.append(msg)

    result.layers = layer_infos
    result.layer_count = len(layer_infos)

    # ------------------------------------------------------------------ #
    # 4. Stack-up flags                                                    #
    # ------------------------------------------------------------------ #
    result.has_top_copper       = _layer_present(stack, "top",    "copper")
    result.has_bottom_copper    = _layer_present(stack, "bottom", "copper")
    result.has_top_silkscreen   = _layer_present(stack, "top",    "silk")
    result.has_bottom_silkscreen= _layer_present(stack, "bottom", "silk")
    result.has_top_soldermask   = _layer_present(stack, "top",    "mask")
    result.has_bottom_soldermask= _layer_present(stack, "bottom", "mask")
    result.has_top_paste        = _layer_present(stack, "top",    "paste")
    result.has_bottom_paste     = _layer_present(stack, "bottom", "paste")
    result.has_outline          = bool(stack.outline)

    # Inner copper layers: anything where use=='copper' and side not top/bottom
    copper_layers = stack.copper_layers  # list of ((side,use), layer) sorted
    result.copper_layer_count = len(copper_layers)
    result.has_inner_copper = any(
        side not in ("top", "bottom")
        for (side, _use), _layer in copper_layers
    )

    # ------------------------------------------------------------------ #
    # 5. Drill files                                                       #
    # ------------------------------------------------------------------ #
    drill = _parse_drill_files(stack)
    result.drill = drill
    result.has_drill = drill.total_holes > 0

    if not result.has_drill:
        warnings.append("No drill hits found — ZIP may be missing Excellon drill files.")

    # ------------------------------------------------------------------ #
    # 6. Sanity checks / warnings                                          #
    # ------------------------------------------------------------------ #
    if not result.has_top_copper and not result.has_bottom_copper:
        warnings.append("No copper layers detected — check that layer filenames are standard.")

    if result.copper_layer_count == 1:
        warnings.append("Only one copper layer found — this appears to be a single-layer board.")

    result.warnings = warnings
    result.errors = errors
    return result

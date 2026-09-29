"""
Pydantic models for the PCB Gerber parser API.
Based on the RS-274X (Extended Gerber) specification.

RS-274X key concepts captured here:
  - Units: MM or INCH  (%MOMM*% / %MOIN*%)
  - Coordinate format: from %FS statement
  - Apertures: Circle, Rectangle, Oval, Polygon, Macro (%ADD...%)
  - Layer polarity: Dark/Clear (%LPD*% / %LPC*%)
  - Operations: D01 draw, D02 move, D03 flash
  - Regions (copper pours): G36/G37
  - Drill files: Excellon format (hole sizes, coordinates)
"""

from __future__ import annotations
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Enumerations
# ---------------------------------------------------------------------------

class GerberUnit(str, Enum):
    MM = "MM"
    INCH = "INCH"
    UNKNOWN = "UNKNOWN"


class ApertureType(str, Enum):
    """Standard RS-274X aperture template types."""
    CIRCLE = "C"        # %ADD10C,diameter*%
    RECTANGLE = "R"     # %ADD10R,X x Y*%
    OVAL = "O"          # %ADD10O,X x Y*%
    POLYGON = "P"       # %ADD10P,outer_dia x vertices*%
    MACRO = "MACRO"     # %AMNAME*...% then %ADD10NAME,...*%


class LayerType(str, Enum):
    """Logical role of a Gerber layer in the PCB stack-up."""
    COPPER = "copper"           # Signal / power copper
    SOLDERMASK = "soldermask"   # Solder mask (negative in RS-274X)
    SILKSCREEN = "silkscreen"   # Silk screen / overlay
    PASTE = "paste"             # Solder paste (for SMT stencil)
    OUTLINE = "outline"         # Board outline / edge cuts
    DRILL = "drill"             # Excellon drill file
    OTHER = "other"


class LayerSide(str, Enum):
    TOP = "top"
    BOTTOM = "bottom"
    INNER = "inner"
    BOTH = "both"   # e.g. drill spans full board


# ---------------------------------------------------------------------------
# Per-layer RS-274X metadata
# ---------------------------------------------------------------------------

class ApertureSummary(BaseModel):
    """Breakdown of aperture types defined in one Gerber file."""
    total: int = Field(0, description="Total number of apertures (%ADD statements)")
    circles: int = Field(0, description="Circle apertures (C template)")
    rectangles: int = Field(0, description="Rectangle apertures (R template)")
    ovals: int = Field(0, description="Oval/Obround apertures (O template)")
    polygons: int = Field(0, description="Polygon apertures (P template)")
    macros: int = Field(0, description="Macro apertures (%AM + %ADD)")


class LayerInfo(BaseModel):
    """
    Full RS-274X information about a single Gerber layer.
    One entry per file found in the ZIP.
    """
    name: str = Field(..., description="Logical layer name, e.g. 'Top Copper', 'Bottom Mask'")
    filename: str = Field(..., description="Filename as it appears inside the ZIP")
    layer_type: LayerType = Field(..., description="Logical role of this layer")
    side: Optional[LayerSide] = Field(None, description="Which side of the board")
    units: GerberUnit = Field(GerberUnit.UNKNOWN, description="Units from %MO statement")
    coord_format: Optional[str] = Field(
        None,
        description="Coordinate format string from %FS, e.g. 'LAXYZ 2.6'"
    )
    # Primitive / operation counts
    flash_count: int = Field(0, description="D03 flash operations (SMD pads, vias, through-hole)")
    draw_count: int = Field(0, description="D01 draw (line / arc) operations")
    region_count: int = Field(0, description="G36/G37 region (copper pour) definitions")
    aperture_summary: ApertureSummary = Field(default_factory=ApertureSummary)
    # Polarity
    has_clear_polarity: bool = Field(
        False,
        description="True if file contains %LPC*% (clear polarity regions - cutouts in copper)"
    )


# ---------------------------------------------------------------------------
# Drill file information (Excellon, companion to RS-274X)
# ---------------------------------------------------------------------------

class DrillInfo(BaseModel):
    """
    Summary extracted from Excellon drill files found in the ZIP.
    Drill files accompany RS-274X Gerbers and define hole positions/sizes.
    """
    total_holes: int = Field(0, description="Total drill hits across all drill files")
    through_holes: int = Field(0, description="Plated through-holes (PTH)")
    vias: int = Field(0, description="Via holes (estimated from small-diameter hits)")
    min_drill_mm: Optional[float] = Field(None, description="Smallest drill diameter in mm")
    max_drill_mm: Optional[float] = Field(None, description="Largest drill diameter in mm")
    drill_sizes_mm: list[float] = Field(
        default_factory=list,
        description="Sorted list of unique drill diameters used"
    )


# ---------------------------------------------------------------------------
# Board dimensions
# ---------------------------------------------------------------------------

class BoardDimensions(BaseModel):
    """
    Physical board dimensions extracted from the outline (Edge.Cuts / GKO) layer.
    Falls back to the bounding box of all layers if no outline is present.
    """
    width_mm: float = Field(..., description="Board width in mm")
    height_mm: float = Field(..., description="Board height in mm")
    area_cm2: float = Field(..., description="Board area in cm² (width × height / 100)")
    source: str = Field("outline", description="'outline' or 'bounding_box' (fallback)")


# ---------------------------------------------------------------------------
# Top-level parse result
# ---------------------------------------------------------------------------

class ParsedGerberResult(BaseModel):
    """
    Full RS-274X parse summary for one uploaded Gerber ZIP.
    This is what the /parse endpoint returns.
    """
    filename: str = Field(..., description="Uploaded ZIP filename")

    # --- Stack-up flags ---
    layer_count: int = Field(0, description="Total Gerber + drill files found")
    copper_layer_count: int = Field(0, description="Number of copper layers (determines board type: 1, 2, 4, 6 …)")
    has_top_copper: bool = False
    has_bottom_copper: bool = False
    has_inner_copper: bool = False
    has_outline: bool = False
    has_drill: bool = False
    has_top_silkscreen: bool = False
    has_bottom_silkscreen: bool = False
    has_top_soldermask: bool = False
    has_bottom_soldermask: bool = False
    has_top_paste: bool = False
    has_bottom_paste: bool = False

    # --- Board data ---
    dimensions: Optional[BoardDimensions] = None
    drill: DrillInfo = Field(default_factory=DrillInfo)

    # --- Per-layer detail ---
    layers: list[LayerInfo] = Field(default_factory=list)

    # --- Diagnostics ---
    warnings: list[str] = Field(default_factory=list)
    errors: list[str] = Field(default_factory=list)

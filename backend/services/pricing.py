"""
backend/pricing_engine.py
--------------------------
Service layer for PCB fabrication cost calculation.

Pricing model (sourced from client's actual pricing logic):
  - Panel dimensions: 1240mm × 1030mm
  - Cost = (area_used × rate_used  +  area_waste × rate_waste) × micro_factor / 100 + base_fee
  - 48hr (Express)  = 7WD cost × 1.5
  - 7WD  (Standard) = calculated base cost

Usage:
    from backend.pricing_engine import calculate_price
    result = calculate_price(length_mm=60.0, width_mm=50.0, quantity=10,
                             material='FR-4', thickness='1.6', micro='35 micro')
"""
from __future__ import annotations

import math
from dataclasses import dataclass

# ── Panel (production sheet) dimensions in mm ─────────────────────────────────
PANEL_WIDTH_MM  = 1240.0
PANEL_HEIGHT_MM = 1030.0

# ── Base processing fee per order (Rs) ───────────────────────────────────────
BASE_FEE = 1000.0

# ── Express surcharge multiplier (48hr vs 7WD) ───────────────────────────────
EXPRESS_FACTOR = 1.5

# ── Rate table: material → thickness → micro → (rate_used, rate_waste) ──────
#   rate_used  = Rs per mm² for PCB area actually used
#   rate_waste = Rs per mm² for panel waste area
#   Values are per mm² then divided by 100 inside the formula
#   (0.00 means pricing not yet set for that combination)
RATE_TABLE: dict[str, dict[str, dict[str, tuple[float, float]]]] = {
    "FR-4": {
        "1.0": {
            "18 micro": (0.00, 0.00),
            "35 micro": (0.00, 0.00),
            "70 micro": (0.00, 0.00),
        },
        "1.6": {
            "18 micro": (0.40, 0.08),
            "35 micro": (0.45, 0.10),
            "70 micro": (0.55, 0.15),
        },
        "2.0": {
            "18 micro": (0.65, 0.20),
            "35 micro": (0.60, 0.20),
            "70 micro": (0.70, 0.25),
        },
    },
    "FR-1": {
        "0.2": {
            "18 micro": (0.30, 0.15),
            "35 micro": (0.31, 0.15),
            "70 micro": (0.33, 0.15),
        },
        "0.8": {
            "18 micro": (0.30, 0.15),
            "35 micro": (0.31, 0.15),
            "70 micro": (0.33, 0.15),
        },
        "1.0": {
            "18 micro": (0.30, 0.15),
            "35 micro": (0.31, 0.15),
            "70 micro": (0.33, 0.15),
        },
        "1.6": {
            "18 micro": (0.31, 0.15),
            "35 micro": (0.31, 0.15),
            "70 micro": (0.33, 0.15),
        },
    },
    "XPC": {
        "1.0": {
            "18 micro": (0.28, 0.14),
            "35 micro": (0.26, 0.13),
            "70 micro": (0.30, 0.15),
        },
    },
    "Aluminum": {
        "1.0": {
            "18 micro": (0.00, 0.00),
            "35 micro": (0.00, 0.00),
            "70 micro": (0.00, 0.00),
        },
        "1.5": {
            "18 micro": (0.00, 0.00),
            "35 micro": (0.00, 0.00),
            "70 micro": (0.00, 0.00),
        },
    },
}

# ── Micro-thickness adjustment factors ────────────────────────────────────────
MICRO_FACTORS = {
    "18 micro": 0.9,
    "35 micro": 1.0,
    "70 micro": 1.1,
}


@dataclass
class PriceResult:
    """Cost breakdown returned by calculate_price()."""
    # 7 WD (Standard) pricing
    cost_7wd_total: float           # Total order value  (₹)
    cost_7wd_single: float          # Per piece cost      (₹)

    # 48 hr (Express) pricing
    cost_48hr_total: float          # Total order value  (₹)
    cost_48hr_single: float         # Per piece cost      (₹)

    # Internals (useful for debugging / display)
    area_used_mm2: float            # PCB area × quantity
    area_waste_mm2: float           # Panel waste area
    rate_used: float                # Rs/mm² for used area
    rate_waste: float               # Rs/mm² for waste area
    micro_factor: float             # Micro-thickness multiplier
    pieces_per_column: int          # Layout: pieces stacked on panel column
    columns_needed: int             # Layout: columns needed for the order


def _get_rates(material: str, thickness: str, micro: str) -> tuple[float, float]:
    """Look up (rate_used, rate_waste) from RATE_TABLE with fallback."""
    mat  = RATE_TABLE.get(material, {})
    thk  = mat.get(thickness, {})
    return thk.get(micro, (0.30, 0.15))   # sensible default fallback


def calculate_price(
    length_mm: float,
    width_mm: float,
    quantity: int,
    material: str = "FR-4",
    thickness: str = "1.6",
    micro: str = "35 micro",
) -> PriceResult | None:
    """
    Calculate PCB fabrication cost.

    Parameters
    ----------
    length_mm   : board length in millimetres
    width_mm    : board width  in millimetres
    quantity    : number of PCBs required
    material    : board material ('FR-4', 'FR-1', 'XPC', 'Aluminum')
    thickness   : board thickness string ('1.0', '1.6', '2.0', …)
    micro       : copper weight ('18 micro', '35 micro', '70 micro')

    Returns
    -------
    PriceResult dataclass, or None if inputs are invalid.
    """
    if length_mm <= 0 or width_mm <= 0 or quantity <= 0:
        return None

    smaller = min(length_mm, width_mm)
    larger  = max(length_mm, width_mm)

    # ── Panel layout ───────────────────────────────────────────────────────────
    pieces_per_column = math.floor(PANEL_HEIGHT_MM / smaller)
    if pieces_per_column == 0:
        pieces_per_column = 1
    columns_needed = math.ceil(quantity / pieces_per_column)

    # ── Areas (mm²) ───────────────────────────────────────────────────────────
    area_used  = length_mm * width_mm * quantity
    area_panel = PANEL_HEIGHT_MM * larger * columns_needed
    area_waste = max(0.0, area_panel - area_used)

    # ── Rates ─────────────────────────────────────────────────────────────────
    rate_used, rate_waste = _get_rates(material, thickness, micro)
    micro_factor = MICRO_FACTORS.get(micro, 1.0)

    # ── Cost formula (same as client's calculateCost) ─────────────────────────
    base_cost = (area_used * rate_used + area_waste * rate_waste) * micro_factor / 100
    base_cost += BASE_FEE

    # ── Lead-time tiers ───────────────────────────────────────────────────────
    cost_7wd   = base_cost
    cost_48hr  = base_cost * EXPRESS_FACTOR

    return PriceResult(
        cost_7wd_total   = round(cost_7wd),
        cost_7wd_single  = round(cost_7wd  / quantity),
        cost_48hr_total  = round(cost_48hr),
        cost_48hr_single = round(cost_48hr / quantity),
        area_used_mm2    = round(area_used, 2),
        area_waste_mm2   = round(area_waste, 2),
        rate_used        = rate_used,
        rate_waste       = rate_waste,
        micro_factor     = micro_factor,
        pieces_per_column= pieces_per_column,
        columns_needed   = columns_needed,
    )

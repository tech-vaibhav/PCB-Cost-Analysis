from math import floor

from backend.models.pricing import Rates


def panel(w: float, l: float, r: Rates) -> dict:
    per_row = max(floor((r.panelW - 2 * r.edgeMargin + r.routingGap) / (w + r.routingGap)), 0)
    per_col = max(floor((r.panelL - 2 * r.edgeMargin + r.routingGap) / (l + r.routingGap)), 0)
    f = per_row * per_col
    panel_area = r.panelW * r.panelL / 1e6
    board_area = w * l / 1e6
    return {
        "perRow": per_row,
        "perCol": per_col,
        "boardsPerPanel": f,
        "boardArea": board_area,
        "matArea": panel_area / f if f > 0 else board_area,
        "utilizationPct": board_area * f / panel_area * 100 if panel_area > 0 else 0,
    }

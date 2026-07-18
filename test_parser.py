"""
test_parser.py
==============
Quick manual test for gerber_parser.parse_gerber_zip().

Usage (from the repo root):
    python test_parser.py                  # uses bundled sample.zip if present
    python test_parser.py path/to/my.zip   # pass your own Gerber ZIP

The script prints the full ParsedGerberResult as pretty JSON so you can
inspect every field that the parser extracts.
"""

import json
import sys
import os
import zipfile
import io

# ── make sure "backend" package is importable ────────────────────────────────
sys.path.insert(0, os.path.dirname(__file__))

from backend.gerber_parser import parse_gerber_zip


def load_zip(path: str) -> bytes:
    with open(path, "rb") as f:
        return f.read()


def make_minimal_sample_zip() -> bytes:
    """
    Build a tiny in-memory Gerber ZIP with:
      - A 50 mm × 40 mm board outline (GKO)
      - A minimal top copper layer with one circle pad flash
      - A minimal Excellon drill file with one PTH hole

    This lets you test the parser even without a real PCB file.
    """
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:

        # Board outline — standard KiCad Edge.Cuts filename gerbonara recognises
        outline = """\
%FSLAX46Y46*%
%MOMM*%
%LPD*%
G01*
%ADD10C,0.050000*%
D10*
X0Y0D02*
X50000000Y0D01*
X50000000Y40000000D01*
X0Y40000000D01*
X0Y0D01*
M02*
"""
        zf.writestr("sample-Edge.Cuts.gbr", outline)

        # Top copper — KiCad front copper filename
        top_cu = """\
%FSLAX46Y46*%
%MOMM*%
%LPD*%
G01*
%ADD11R,2.000000X2.000000*%
D11*
X25000000Y20000000D03*
M02*
"""
        zf.writestr("sample-F.Cu.gbr", top_cu)

        # Bottom copper — needed so gerbonara sees a 2-layer board
        bot_cu = """\
%FSLAX46Y46*%
%MOMM*%
%LPD*%
G01*
%ADD12C,1.600000*%
D12*
X25000000Y20000000D03*
M02*
"""
        zf.writestr("sample-B.Cu.gbr", bot_cu)

        # Top soldermask
        top_mask = """\
%FSLAX46Y46*%
%MOMM*%
%LPD*%
G01*
%ADD13C,2.200000*%
D13*
X25000000Y20000000D03*
M02*
"""
        zf.writestr("sample-F.Mask.gbr", top_mask)

        # Top silkscreen
        top_silk = """\
%FSLAX46Y46*%
%MOMM*%
%LPD*%
G01*
%ADD14C,0.150000*%
D14*
X5000000Y5000000D02*
X10000000Y5000000D01*
M02*
"""
        zf.writestr("sample-F.SilkS.gbr", top_silk)

        # Excellon drill — one 1.0 mm PTH hole (KiCad-style filename)
        drill = """\
M48
METRIC,LZ
T1C1.000
%
G90
G05
T1
X025000Y020000
M30
"""
        zf.writestr("sample-PTH.drl", drill)

    return buf.getvalue()


def main():
    if len(sys.argv) >= 2:
        zip_path = sys.argv[1]
        print(f"Loading ZIP from: {zip_path}")
        zip_bytes = load_zip(zip_path)
        filename = os.path.basename(zip_path)
    else:
        print("No ZIP file provided — using built-in minimal sample.\n")
        zip_bytes = make_minimal_sample_zip()
        filename = "sample.zip"

    print(f"Parsing '{filename}' ({len(zip_bytes):,} bytes)...\n")
    result = parse_gerber_zip(zip_bytes, filename=filename)

    # Pretty-print as JSON
    print(json.dumps(result.model_dump(), indent=2))

    # ── Summary ──────────────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)

    if result.dimensions:
        d = result.dimensions
        print(f"  Board size  : {d.width_mm} mm × {d.height_mm} mm  ({d.area_cm2} cm²)  [{d.source}]")
    else:
        print("  Board size  : unknown")

    print(f"  Copper layers: {result.copper_layer_count}")
    print(f"  Total layers : {result.layer_count}")
    print(f"  Has outline  : {result.has_outline}")
    print(f"  Has drill    : {result.has_drill}")

    if result.drill.total_holes:
        dr = result.drill
        print(f"  Drill holes  : {dr.total_holes} total  (PTH={dr.through_holes})")
        print(f"  Drill sizes  : {dr.drill_sizes_mm} mm")

    print(f"\n  Layer breakdown:")
    for layer in result.layers:
        print(f"    [{layer.side}/{layer.layer_type}]  {layer.name}  ({layer.filename})")
        print(f"      units={layer.units}  flashes={layer.flash_count}"
              f"  draws={layer.draw_count}  regions={layer.region_count}")
        print(f"      apertures: {layer.aperture_summary.model_dump()}")

    if result.warnings:
        print(f"\n  Warnings ({len(result.warnings)}):")
        for w in result.warnings:
            print(f"    ** WARN: {w}")

    if result.errors:
        print(f"\n  Errors ({len(result.errors)}):")
        for e in result.errors:
            print(f"    !! ERR:  {e}")


if __name__ == "__main__":
    main()

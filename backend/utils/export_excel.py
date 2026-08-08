"""
export_excel.py
===============
Single script: calls the Gerber parser service and writes an Excel report.

HOW TO USE
----------
1. Drop your Gerber ZIP(s) into backend/test_files/
2. Edit the CONFIG section below:
   - Set ZIP_FILES to the filename(s) you want to test
     Use ["*"] to scan ALL zips in the folder automatically
3. Run: python export_excel.py
4. Open the generated PCB_Gerber_Report.xlsx

ARCHITECTURE
------------
  backend/gerber_parser.py  <-- parser SERVICE (do not edit)
          |
          | called by
          v
  export_excel.py           <-- this script (configure & run)
          |
          | writes
          v
  PCB_Gerber_Report.xlsx
"""

# =============================================================================
# CONFIG - Edit these values
# =============================================================================

# Folder where your Gerber ZIP files are placed
TEST_FILES_FOLDER = r"..\test_files"

# ZIP files to parse.
# ↓ CHANGE THIS to the filename(s) you want to test
ZIP_FILES = ["Gerber_DC_5V-3V3_TWO-Channel-V1.0-PCB-copy.zip"]
# To test multiple files:  ZIP_FILES = ["Gerber_DC_5V-3V3_TWO-Channel-V1.0-PCB-copy.zip"]
# To scan ALL files:       ZIP_FILES = ["*"]

# Output Excel is auto-named after the ZIP file: Download-Gerber-Files.xlsx
# No need to change this.

# =============================================================================
# DO NOT EDIT BELOW THIS LINE
# =============================================================================

import sys, os, warnings, contextlib
from pathlib import Path
from datetime import datetime

warnings.filterwarnings("ignore")   # suppress gerbonara UserWarnings from console
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

# Helper: silences any stdout noise from third-party libs during parsing
@contextlib.contextmanager
def _quiet():
    with open(os.devnull, "w") as devnull:
        old = sys.stdout
        sys.stdout = devnull
        try:
            yield
        finally:
            sys.stdout = old

import openpyxl
from openpyxl.styles import PatternFill, Font, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from backend.services.parser import parse_gerber_zip   # <-- the parser service

# ── Palette ───────────────────────────────────────────────────────────────────
C_NAVY  = "1B2A4A"
C_TEAL  = "0D7C8F"
C_LIGHT = "E8F4F8"
C_WHITE = "FFFFFF"
C_RED   = "FCE4E4"
C_GREEN = "E6F4EA"
C_AMBER = "FFF3CD"
C_DARK  = "1A1A2E"
C_GRAY  = "CCCCCC"

def f(h):   return PatternFill("solid", fgColor=h)
def bf(sz=10, col="000000", it=False):
    return Font(name="Calibri", bold=True, size=sz, color=col, italic=it)
def nf(sz=10, col="000000"):
    return Font(name="Calibri", size=sz, color=col)
def ctr(): return Alignment(horizontal="center", vertical="center", wrap_text=True)
def lft(): return Alignment(horizontal="left",   vertical="center", wrap_text=True)

def tb():
    s = Side(style="thin", color=C_GRAY)
    return Border(left=s, right=s, top=s, bottom=s)
def hb():
    s = Side(style="thin", color=C_GRAY)
    b = Side(style="medium", color=C_NAVY)
    return Border(left=s, right=s, top=s, bottom=b)

# Internal parser messages hidden from client view
_INTERNAL = ("Standard layer detection failed", "Unrecognised layer skipped")

def clean_issues(result):
    warns  = [w for w in result.warnings if not any(w.startswith(p) for p in _INTERNAL)]
    errors = list(result.errors)
    return warns, errors

def status(result):
    _, errs = clean_issues(result)
    return "OK" if not errs else "ERROR"

def yesno(v): return "YES" if v else "NO"

# ─────────────────────────────────────────────────────────────────────────────
# SHEET 1 — Summary (one row per ZIP)
# ─────────────────────────────────────────────────────────────────────────────

COLS = [
    ("Filename",        28), ("Status",    10), ("Width mm",  11),
    ("Height mm",       11), ("Area cm2",  10), ("Total Layers", 12),
    ("Copper Layers",   13), ("Inner Cu",   9), ("Outline",    9),
    ("Top Copper",       9), ("Bot Copper", 9), ("Top Mask",   9),
    ("Bot Mask",         9), ("Top Silk",   9), ("Bot Silk",   9),
    ("Top Paste",        9), ("Bot Paste",  9), ("Drill Holes",11),
    ("PTH",              7), ("Min Drill",  9), ("Max Drill",  9),
    ("All Sizes",       26), ("Warns",      8), ("Errors",     8),
]

def build_summary(wb, parsed):
    ws = wb.create_sheet("Summary", 0)
    ws.sheet_view.showGridLines = False
    ws.column_dimensions["A"].width = 2

    for i, (_, w) in enumerate(COLS, 2):
        ws.column_dimensions[get_column_letter(i)].width = w

    last = 1 + len(COLS)

    # Title
    ws.row_dimensions[1].height = 6
    ws.row_dimensions[2].height = 46
    ws.merge_cells(f"B2:{get_column_letter(last)}2")
    t = ws["B2"]
    t.value = "PCB Gerber Parser — Batch Analysis Report"
    t.font = bf(18, C_WHITE); t.fill = f(C_NAVY); t.alignment = ctr()

    ws.row_dimensions[3].height = 16
    ws.merge_cells(f"B3:{get_column_letter(last)}3")
    s = ws["B3"]
    s.value = (f"Files tested: {len(parsed)}   |   "
               f"Folder: {TEST_FILES_FOLDER}   |   "
               f"Generated: {datetime.now().strftime('%d %b %Y, %H:%M')}")
    s.font = bf(9, C_WHITE, it=True); s.fill = f(C_TEAL); s.alignment = ctr()

    # Headers
    ws.row_dimensions[4].height = 36
    for i, (label, _) in enumerate(COLS, 2):
        c = ws.cell(row=4, column=i, value=label)
        c.font = bf(9, C_WHITE); c.fill = f(C_TEAL)
        c.alignment = ctr(); c.border = hb()

    # Data
    for ri, (name, result) in enumerate(parsed):
        r = 5 + ri
        ws.row_dimensions[r].height = 22
        bg = C_LIGHT if ri % 2 == 0 else C_WHITE
        st = status(result)
        warns, errs = clean_issues(result)
        d  = result.dimensions
        dr = result.drill

        vals = [
            name, st,
            d.width_mm if d else "N/A", d.height_mm if d else "N/A",
            d.area_cm2 if d else "N/A",
            result.layer_count, result.copper_layer_count,
            yesno(result.has_inner_copper), yesno(result.has_outline),
            yesno(result.has_top_copper),   yesno(result.has_bottom_copper),
            yesno(result.has_top_soldermask), yesno(result.has_bottom_soldermask),
            yesno(result.has_top_silkscreen), yesno(result.has_bottom_silkscreen),
            yesno(result.has_top_paste),    yesno(result.has_bottom_paste),
            dr.total_holes, dr.through_holes,
            dr.min_drill_mm if dr.min_drill_mm else "N/A",
            dr.max_drill_mm if dr.max_drill_mm else "N/A",
            ", ".join(str(x) for x in dr.drill_sizes_mm) or "N/A",
            len(warns), len(errs),
        ]

        for ci, val in enumerate(vals, 2):
            c = ws.cell(row=r, column=ci, value=val)
            c.border = tb()

            # Status column
            if ci == 3:
                ok = (val == "OK")
                c.font = bf(9, "1A7A3A" if ok else "C0392B")
                c.fill = f(C_GREEN if ok else C_RED); c.alignment = ctr()
            # YES/NO flag columns
            elif ci in range(9, 19):
                yes = (val == "YES")
                c.font = bf(9, "1A7A3A" if yes else "999999")
                c.fill = f(C_GREEN if yes else bg); c.alignment = ctr()
            # Warn/error counts
            elif ci == 24:
                c.font = bf(9, "D35400" if val > 0 else "999999")
                c.fill = f(C_AMBER if val > 0 else bg); c.alignment = ctr()
            elif ci == 25:
                c.font = bf(9, "C0392B" if val > 0 else "999999")
                c.fill = f(C_RED if val > 0 else bg); c.alignment = ctr()
            else:
                c.font = nf(9); c.fill = f(bg)
                c.alignment = lft() if ci == 2 else ctr()

    ws.freeze_panes = "C5"


# ─────────────────────────────────────────────────────────────────────────────
# SHEET 2+ — Per-file layer detail
# ─────────────────────────────────────────────────────────────────────────────

def safe_name(name):
    for ch in r'\/*?:[].': name = name.replace(ch, "_")
    return name[:31]

def build_file_sheet(wb, name, result):
    ws = wb.create_sheet(safe_name(Path(name).stem))
    ws.sheet_view.showGridLines = False

    for col, w in zip("ABCDEFGHIJKLMN",
                      [2,20,28,13,10,8,12,9,9,10,10,10,14,2]):
        ws.column_dimensions[col].width = w

    HDRS = ["", "Layer Name", "Filename", "Type", "Side", "Units",
            "Coord Format", "Flashes", "Draws", "Regions",
            "Apertures", "Circles", "Rect/Oval/Mac", ""]

    ws.row_dimensions[1].height = 6
    ws.row_dimensions[2].height = 36
    ws.merge_cells("B2:M2")
    t = ws["B2"]
    t.value = name; t.font = bf(13, C_WHITE)
    t.fill = f(C_NAVY); t.alignment = ctr()

    st = status(result); d = result.dimensions; dr = result.drill
    warns, errs = clean_issues(result)
    info = (f"Status: {st}   |   "
            f"Board: {f'{d.width_mm} x {d.height_mm} mm' if d else 'N/A'}   |   "
            f"Copper layers: {result.copper_layer_count}   |   "
            f"Drill holes: {dr.total_holes}")
    ws.row_dimensions[3].height = 16
    ws.merge_cells("B3:M3")
    sub = ws["B3"]
    sub.value = info; sub.font = bf(9, C_WHITE, it=True)
    sub.fill = f(C_TEAL if st == "OK" else "8B0000"); sub.alignment = ctr()

    ws.row_dimensions[4].height = 30
    for ci, h in enumerate(HDRS[1:-1], 2):
        c = ws.cell(row=4, column=ci, value=h)
        c.font = bf(9, C_WHITE); c.fill = f(C_TEAL)
        c.alignment = ctr(); c.border = hb()

    if not result.layers:
        ws.merge_cells("B5:M5")
        nc = ws.cell(row=5, column=2, value="No layers parsed. Check warnings/errors below.")
        nc.font = bf(10, "C0392B"); nc.fill = f(C_RED); nc.alignment = lft(); nc.border = tb()
    else:
        for i, layer in enumerate(result.layers):
            r = 5 + i
            ws.row_dimensions[r].height = 20
            bg = C_LIGHT if i % 2 == 0 else C_WHITE
            ap = layer.aperture_summary
            vals = [
                layer.name, layer.filename,
                layer.layer_type.value.title(),
                layer.side.value.title() if layer.side else "-",
                layer.units.value, layer.coord_format or "-",
                layer.flash_count, layer.draw_count, layer.region_count,
                ap.total, ap.circles,
                f"{ap.rectangles} / {ap.ovals} / {ap.macros}",
            ]
            for ci, val in enumerate(vals, 2):
                c = ws.cell(row=r, column=ci, value=val)
                c.font = nf(9); c.fill = f(bg); c.border = tb()
                c.alignment = lft() if ci <= 3 else ctr()

    ws.freeze_panes = "B5"

    # Issues section
    all_issues = [("WARN", w) for w in warns] + [("ERROR", e) for e in errs]
    if all_issues:
        br = 5 + max(len(result.layers), 1) + 2
        for j, (kind, msg) in enumerate(all_issues):
            r2 = br + j
            ws.row_dimensions[r2].height = 26
            bg2 = C_RED if kind == "ERROR" else C_AMBER
            col = "C0392B" if kind == "ERROR" else "D35400"
            kc = ws.cell(row=r2, column=2, value=kind)
            kc.font = bf(9, col); kc.fill = f(bg2); kc.alignment = ctr(); kc.border = tb()
            mc = ws.cell(row=r2, column=3, value=msg)
            mc.font = nf(9); mc.fill = f(bg2); mc.border = tb()
            mc.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
            ws.merge_cells(f"C{r2}:M{r2}")


# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

def main():
    folder = Path(TEST_FILES_FOLDER)
    if not folder.exists():
        print(f"ERROR: Folder not found: {folder}"); return

    if ZIP_FILES == ["*"]:
        files = sorted(folder.glob("*.zip"))
    else:
        files = [folder / name for name in ZIP_FILES]
        files = [p for p in files if p.exists()]

    if not files:
        print(f"No ZIP files found. Check TEST_FILES_FOLDER and ZIP_FILES in config."); return

    print(f"\nParsing {len(files)} file(s)...\n")
    parsed = []
    for zp in files:
        print(f"  [{files.index(zp)+1}/{len(files)}] {zp.name} ...", end=" ", flush=True)
        with open(zp, "rb") as fh:
            data = fh.read()
        with _quiet():
            result = parse_gerber_zip(data, filename=zp.name)
        st = status(result)
        print(f"{st}  ({len(result.layers)} layers, {result.drill.total_holes} drill holes)")
        parsed.append((zp.name, result))

    # Auto-name output: single file -> "MyBoard.xlsx", multiple -> "PCB_Batch_Report.xlsx"
    if len(files) == 1:
        out = Path(files[0].stem + ".xlsx")
    else:
        out = Path("PCB_Batch_Report.xlsx")

    print(f"\nBuilding Excel: {out}")
    wb = openpyxl.Workbook()
    del wb[wb.sheetnames[0]]

    build_summary(wb, parsed)
    for name, result in parsed:
        build_file_sheet(wb, name, result)

    try:
        wb.save(out)
        print(f"Done  ->  {out}\n")
    except PermissionError:
        fallback_out = Path(f"{out.stem}_{datetime.now().strftime('%H%M%S')}.xlsx")
        print(f"WARNING: '{out}' is locked by another program (e.g. MS Excel).")
        print(f"Saving to fallback: {fallback_out}")
        wb.save(fallback_out)
        print(f"Done  ->  {fallback_out}\n")


if __name__ == "__main__":
    main()

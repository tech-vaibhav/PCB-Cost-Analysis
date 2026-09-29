# API contract

Base URL from `VITE_API_URL` (default http://127.0.0.1:8000). Errors: `{ "detail": "message" }` with 4xx/5xx.

## Public

### POST /api/gerber/parse (multipart, field `file`, .zip only, max 50 MB)
Returns ParsedGerberResult (see backend/models/gerber.py). Frontend uses: dimensions.width_mm, dimensions.height_mm, copper_layer_count, drill.min_drill_mm, layers[], layer_count, warnings[].

### GET /api/pricing/options
Option lists for the quote form, derived from admin lookups.
```json
{
  "orderType": ["Bare PCB","PCBA","Assembly Only"],
  "layers": ["1","2","4","6","8"],
  "thickness": ["0.6","0.8","1.0","1.2","1.6","2.0","2.4","3.2"],
  "copper": ["0.5","1","1.5","2","3","4"],
  "material": ["FR4 TG130","FR4 TG150","FR4 TG170","High-Freq","Aluminum"],
  "maskColor": ["Green","Blue","Red","Black","White","Yellow","Purple"],
  "silkscreen": ["White","Black","Yellow","None"],
  "finish": ["HASL","HASL-LF","ENIG-1","ENIG-2","ENIG-3","ImmTin","ImmSilver","OSP"],
  "traceSpace": ["6/6","5/5","4/4","3/3"],
  "minHole": ["0.40","0.30","0.25","0.20","0.15"],
  "ipcStd": ["IPC-2","IPC-3"],
  "testing": ["FlyingProbe","Fixture","None"],
  "express": ["Standard","Urgent"],
  "specials": ["impedance","blindVias","goldFingers","halfHole","resinPlug","metalEdge","halogenFree"]
}
```

### POST /api/quote
Request (all strings except numbers and specials):
```json
{
  "boardW": 130, "boardL": 80, "quantity": 275,
  "layers": "2", "orderType": "Bare PCB", "thickness": "1.6", "copper": "1",
  "material": "FR4 TG130", "maskColor": "Green", "silkscreen": "White",
  "finish": "HASL-LF", "traceSpace": "6/6", "minHole": "0.30", "ipcStd": "IPC-2",
  "testing": "FlyingProbe", "express": "Standard",
  "specials": { "impedance": false, "blindVias": false, "goldFingers": false, "halfHole": false, "resinPlug": false, "metalEdge": false, "halogenFree": false }
}
```
Response (customer safe, no cost or competitor data):
```json
{
  "pricePerBoard": 73.11, "quantity": 275, "engFee": 0,
  "subtotal": 20105.25, "gstPct": 18, "gst": 3618.95, "total": 23724.2,
  "delivery": "7-10 working days",
  "panel": { "boardsPerPanel": 12, "perRow": 4, "perCol": 3, "utilizationPct": 78.2, "panelsNeeded": 23 },
  "summary": { "Board": "130 x 80 mm", "Layers": "2", "Thickness": "1.6 mm", "Copper": "1 oz", "Surface finish": "HASL-LF", "Trace/space": "6/6 mil", "Min hole": "0.30 mm", "Solder mask": "Green", "IPC class": "IPC-2", "Testing": "FlyingProbe", "Production": "Standard", "Special reqs": "None" }
}
```
Invalid option values return 422 with `detail` naming the field.

## Admin (Authorization: Bearer <supabase access_token>; 401 if missing/invalid, 403 if not admin)

### GET /api/admin/pricing
```json
{ "rates": {...}, "lookups": {...}, "constants": {...}, "updatedAt": "2026-09-30T10:00:00Z" | null, "source": "supabase" | "defaults" }
```
Shapes and keys exactly as docs/pricing-model.md. Lookup maps are `{ "option": number }`; `autoMarkup` is `[[qtyCeiling, fraction], ...]`; `deliveryText` values are strings; `materialOptions` and `silkscreenOptions` are string arrays.

### PUT /api/admin/pricing
Body: `{ "rates": {...}, "lookups": {...}, "constants": {...} }` (full replace). Validated by pydantic; returns same shape as GET.

### POST /api/admin/pricing/reset
Restores built-in defaults into Supabase. Returns same shape as GET.

### POST /api/admin/quote
Body: same as /api/quote plus optional `"overrides": { "rates": {...partial}, "constants": {...partial} }` for what-if analysis.
Response: everything from /api/quote plus:
```json
{
  "costPerBoard": 66.46, "orderCost": 18276, "listPerBoard": 73.11, "pricingMode": "auto-beat" | "markup", "markupPct": 10,
  "produced": 275, "costHeads": [ { "item": "Bare PCB (JLCPCB)", "amount": 62.1, "sharePct": 93.4 }, ... ],
  "profit": { "perBoard": 6.65, "total": 1829, "marginPct": 9.1 },
  "competitors": [ { "name": "JLCPCB", "bare": 62.1, "landed": 76.96, "total": 24973, "note": "China + DHL + 10% duty" }, ... ],
  "cheapest": { "name": "JLCPCB", "landed": 76.96 },
  "savings": { "perBoard": 3.85, "pct": 5.0 },
  "breakEvenBoards": 1234 | null,
  "monthly": { "labour": 21240, "energy": 12000, "overheads": 54000, "kwh": 1123 }
}
```

## Auth
Frontend signs in with supabase-js (email + password) and sends `session.access_token`. Backend verifies the JWT against `SUPABASE_JWKS_URL` (audience `authenticated`) and checks the email is in `ADMIN_EMAILS`.

## Supabase table
`pricing_config(key text primary key, value jsonb not null, updated_at timestamptz not null default now())`. Rows: `rates`, `lookups`, `constants`. Backend reads via PostgREST with the secret key. Missing table or rows fall back to defaults and report `source: "defaults"`.

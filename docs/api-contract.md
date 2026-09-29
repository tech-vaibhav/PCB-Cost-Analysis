# API contract

Base URL from `VITE_API_URL` (default http://127.0.0.1:8000). Errors: `{ "detail": "message" }` with 4xx/5xx.

Pricing lives only in Supabase; there are no built-in defaults. Any endpoint that needs the pricing config returns 503 `{ "detail": "Pricing config is not available" }` when it cannot be loaded (tables missing, no `pricing_policy` row, bad data, network).

## Public

### GET /api/health
`{ "ok": true, "pricing": "ok" | "unavailable" }`

### POST /api/gerber/parse (multipart, field `file`, .zip only, max 50 MB)
Returns ParsedGerberResult (see backend/models/gerber.py). Frontend uses: dimensions.width_mm, dimensions.height_mm, copper_layer_count, drill.min_drill_mm, layers[], layer_count, warnings[].

### GET /api/pricing/options
Option lists for the quote form, derived from admin lookups (`orderType` is the `order_types` table in `sort_order`).
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
Request (all strings except numbers and specials; `specials` keys must be in the specials option list, missing keys mean false):
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

## Admin (Authorization: Bearer <token from /api/auth/signin>; 401 if missing, invalid, expired, or the user is not approved or no longer exists)

### GET /api/admin/pricing
```json
{ "rates": {...}, "lookups": {...}, "constants": {...}, "updatedAt": "2026-09-30T10:00:00Z" }
```
Shapes and keys exactly as docs/pricing-model.md. Lookup maps are `{ "option": number }`; `autoMarkup` is `[[qtyCeiling, fraction], ...]`; `deliveryText` values are strings; `materialOptions` and `silkscreenOptions` are string arrays; `orderTypes` is `{ "Bare PCB": false, "PCBA": true, ... }` (value = includes assembly, key order = sort order); `competitors` is `[{ "name": "JLCPCB", "model": "usd_import" | "inr_domestic", "note": "China + DHL + duty", "isBareSource": true, "params": { "min_qty_cap": 5, ... } }, ...]` in sort order.

### PUT /api/admin/pricing
Body: `{ "rates": {...}, "lookups": {...}, "constants": {...} }` (full replace, every field required). Validated by pydantic; returns same shape as GET. Rate rows keep their `group_name` and `unit` from the database; rate keys the config does not know are left untouched.

### POST /api/admin/quote
Body: same as /api/quote plus optional `"overrides": { "rates": {...partial}, "constants": {...partial} }` for what-if analysis.
Response: everything from /api/quote plus:
```json
{
  "costPerBoard": 66.46, "orderCost": 18276, "listPerBoard": 73.11, "pricingMode": "auto-beat" | "markup", "markupPct": 10,
  "produced": 275, "costHeads": [ { "item": "Bare PCB (JLCPCB)", "amount": 62.1, "sharePct": 93.4 }, ... ],
  "profit": { "perBoard": 6.65, "total": 1829, "marginPct": 9.1 },
  "competitors": [ { "name": "JLCPCB", "bare": 62.1, "landed": 76.96, "total": 24973, "note": "China + DHL + duty" }, ... ],
  "cheapest": { "name": "JLCPCB", "landed": 76.96 },
  "savings": { "perBoard": 3.85, "pct": 5.0 },
  "breakEvenBoards": 1234 | null,
  "monthly": { "labour": 21240, "energy": 12000, "overheads": 54000, "kwh": 1123 }
}
```

## Auth (no token needed except /me)
Backend issues its own HS256 JWT (`JWT_SECRET`, valid `JWT_EXPIRES_HOURS`, default 168) with `sub` = admin_users id and `email`. Frontend stores it and sends `Authorization: Bearer <token>`.

### POST /api/auth/signup (201)
Body: `{ "name": "Ann", "phone": "min 5 chars", "email": "a@x.com", "password": "min 8 chars", "note": "optional" }`. Email is lowercased. Creates a pending account and returns `{ "status": "pending" }`. 409 `"An account with this email already exists"`, 422 on bad input.

### POST /api/auth/signin
Body: `{ "email": "a@x.com", "password": "..." }`. Returns `{ "token": "jwt", "user": { "id": "uuid", "name": "Ann", "email": "a@x.com" } }`. 401 `"Invalid email or password"`; 403 with detail `"pending"` when the account is not approved yet.

### GET /api/auth/me
Returns `{ "id", "name", "email", "phone", "status": "approved" }`; 401 as for admin routes.

## Team (admin)

### GET /api/admin/users
All accounts, pending first, then by `createdAt`.
```json
{ "users": [ { "id": "uuid", "name": "Ann", "phone": "98765 43210", "email": "a@x.com", "note": "..." | null, "status": "pending" | "approved", "createdAt": "2026-09-30T10:00:00Z", "lastSignInAt": "..." | null, "isYou": true } ] }
```

### POST /api/admin/users/{id}/approve
Sets status to approved. Returns one user object as above; 404 if missing.

### DELETE /api/admin/users/{id} (204)
Deletes the account (also rejects a pending signup). 403 `"You cannot remove yourself"` when `id` is the caller.

Supabase errors on any endpoint that needs the database return 502.

## Supabase tables
Schema changes after the first setup ship as files in `supabase/migrations`. Tables generated by `backend/scripts/make_schema.py` into `supabase/schema.sql`, data in `supabase/seed.sql` (dumped from the live database by `backend/scripts/dump_seed.py`); every table has `updated_at` and RLS with no policies (secret key only).
- `pricing_rates(key, group_name, unit, value)`: every numeric rate and constant, one row each.
- `pricing_policy(id = 1, fab_source, beat_competitor, markup_override_pct)`: single row; its `updated_at` is the config's last saved time.
- `option_factors(category, option, value, sort_order)`: layer, thickness, copper, finish, trace, hole, mask, testing and IPC factors.
- `delivery_speeds(speed, price_factor, delivery_text, sort_order)`.
- `special_requirements(key, surcharge_pct, eng_fee_inr, sort_order)`.
- `markup_tiers(max_qty, markup_pct)`: auto markup ladder in percent.
- `form_options(category, option, sort_order)`: material and silkscreen choices.
- `order_types(option, is_assembly, sort_order)`: quote order types; `is_assembly` switches on BOM, assembly packaging and competitor assembly cost.
- `competitors(name, model, note, is_bare_source, sort_order)`: `model` picks the formula (`usd_import` or `inr_domestic`); the cheapest `is_bare_source` row is the outsourced bare board.
- `competitor_params(competitor, param, value)`: named numbers for each competitor's formula (see docs/pricing-model.md); cascades on competitor delete.
- `admin_users(id, name, phone, email, password_hash, note, status, created_at, last_sign_in_at)`: panel logins; argon2 hashes, status `pending` or `approved`. Created with `if not exists`, so re-running the schema keeps it.

Backend reads via PostgREST (cached 60 s). Missing tables or no `pricing_policy` row mean 503, never a fallback.

# Backend

1. Copy `backend/.env.example` to `backend/.env` and fill in SUPABASE_URL, SUPABASE_SECRET_KEY, JWT_SECRET (long random string), JWT_EXPIRES_HOURS and CORS_ORIGINS.
2. In the Supabase SQL editor run `supabase/schema.sql` once (all tables including `admin_users`, no data), then `supabase/seed.sql` (pricing data, safe to re-run). Re-running the schema drops the pricing tables and keeps `admin_users`. Regenerate the schema with `python backend/scripts/make_schema.py supabase/schema.sql`. On an existing database, run any file in `supabase/migrations` you have not run yet (in name order; each is safe to re-run).
3. Start: `cd backend && venv/Scripts/python main.py` (http://127.0.0.1:8000, docs at /docs).
4. Sign up in the panel at `/admin/signup`. The account starts as pending.
5. Approve your own row: set `status` to `approved` in the `admin_users` table, or run `python backend/scripts/approve_admin.py you@example.com` (from repo root).
6. Sign in. Further admins sign up the same way and are approved from the Team page.
7. Test: `backend/venv/Scripts/python -m pytest backend/tests -q` (from repo root).

Pricing config lives in ten readable tables (`pricing_rates`, `pricing_policy`, `option_factors`, `delivery_speeds`, `special_requirements`, `markup_tiers`, `form_options`, `order_types`, `competitors`, `competitor_params`). There are no built-in defaults: if they are missing or empty the pricing endpoints return 503 (`/api/health` shows `pricing: "unavailable"`). `python backend/scripts/dump_seed.py` (read only) regenerates `supabase/seed.sql` and the test fixture `backend/tests/fixtures/pricing_config.json` from the live database.

# Backend

1. Run `supabase/schema.sql` once in the Supabase SQL editor.
2. Copy `backend/.env.example` to `backend/.env` and fill in the Supabase keys, ADMIN_EMAILS and CORS_ORIGINS.
3. Create an admin login: `python backend/scripts/create_admin.py you@example.com 'password'` (from repo root), and list that email in ADMIN_EMAILS.
4. Start: `cd backend && venv/Scripts/python main.py` (http://127.0.0.1:8000, docs at /docs).
5. Test: `backend/venv/Scripts/python -m pytest backend/tests -q` (from repo root).

Pricing config lives in the `pricing_config` table; if it is missing the API uses built-in defaults (`/api/health` shows `configSource`).

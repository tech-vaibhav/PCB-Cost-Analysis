# PCB Cost Analysis

Gerber parser plus a quote engine with an admin panel for every pricing rate.

## Layout
- `backend/` FastAPI. `core/` settings, auth, Supabase client. `routers/` HTTP only. `services/gerber/` parser. `services/pricing/` cost model, config store. `models/` pydantic. `tests/`.
- `frontend/` React + Vite. `features/quote/` customer page. `features/admin/` admin panel. `components/ui/` shared primitives. `api/` fetch wrappers. `lib/` supabase and formatting.
- `docs/pricing-model.md` every formula and default. `docs/api-contract.md` endpoints and JSON shapes.
- `supabase/schema.sql` the one table the admin panel writes to.

## Run
1. Copy `backend/.env.example` to `backend/.env` and `frontend/.env.example` to `frontend/.env`, fill in Supabase values.
2. Run `supabase/schema.sql` once in the Supabase SQL editor.
3. Create the admin login: `backend/venv/Scripts/python backend/scripts/create_admin.py you@example.com yourpassword` and put that email in `ADMIN_EMAILS`.
4. Backend: `backend/venv/Scripts/python -m uvicorn backend.main:app --reload --port 8000`
5. Frontend: `cd frontend && npm install && npm run dev`, open http://localhost:5173 (admin at /admin).
6. Tests: `backend/venv/Scripts/python -m pytest backend/tests -q`

Until the table exists the API serves built-in defaults and admin saves return 502.

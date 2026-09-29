import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import httpx

from backend.core.settings import settings

if len(sys.argv) != 3:
    sys.exit("usage: python backend/scripts/create_admin.py EMAIL PASSWORD")
email, password = sys.argv[1:]
key = settings.supabase_secret_key
r = httpx.post(
    f"{settings.supabase_url}/auth/v1/admin/users",
    headers={"apikey": key, "Authorization": f"Bearer {key}"},
    json={"email": email, "password": password, "email_confirm": True},
    timeout=15,
)
print("created" if r.is_success else f"error {r.status_code}: {r.text}")
print(f"Make sure {email} is listed in ADMIN_EMAILS in backend/.env")

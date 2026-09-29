from datetime import datetime, timezone

from backend.core import supabase
from backend.core.security import hash_password

T = "admin_users"
COLS = "id,name,phone,email,note,status,created_at,last_sign_in_at"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _one(rows: list[dict]) -> dict | None:
    return rows[0] if rows else None


def get_by_email(email: str) -> dict | None:
    # includes password_hash, sign-in only
    return _one(supabase.get_rows(T, {"email": f"eq.{email.strip().lower()}", "select": COLS + ",password_hash"}))


def get_by_id(user_id: str) -> dict | None:
    return _one(supabase.get_rows(T, {"id": f"eq.{user_id}", "select": COLS}))


def create_pending(name: str, phone: str, email: str, password: str, note: str | None) -> dict:
    row = {"name": name, "phone": phone, "email": email.strip().lower(), "password_hash": hash_password(password), "note": note}
    try:
        return supabase.insert_rows(T, [row], {"select": COLS})[0]
    except supabase.SupabaseError as exc:
        if "23505" in str(exc):
            raise ValueError("already exists") from exc
        raise


def list_users() -> list[dict]:
    return supabase.get_rows(T, {"select": COLS, "order": "status.desc,created_at"})


def approve(user_id: str) -> dict | None:
    return _one(supabase.patch_rows(T, {"id": f"eq.{user_id}", "select": COLS}, {"status": "approved", "updated_at": _now()}))


def delete(user_id: str) -> None:
    supabase.delete_rows(T, {"id": f"eq.{user_id}"})


def touch_sign_in(user_id: str) -> None:
    supabase.patch_rows(T, {"id": f"eq.{user_id}", "select": "id"}, {"last_sign_in_at": _now()})

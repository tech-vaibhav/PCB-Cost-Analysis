import httpx

from backend.core.settings import settings


class SupabaseError(Exception):
    pass


def _request(method: str, table: str, **kw) -> list[dict]:
    key = settings.supabase_secret_key
    headers = {"apikey": key, "Authorization": f"Bearer {key}", **kw.pop("headers", {})}
    try:
        r = httpx.request(method, f"{settings.supabase_url}/rest/v1/{table}", headers=headers, timeout=10, **kw)
    except httpx.HTTPError as exc:
        raise SupabaseError(str(exc)) from exc
    if not r.is_success:
        raise SupabaseError(r.text)
    return r.json()


def get_rows(table: str, params: dict) -> list[dict]:
    return _request("GET", table, params=params)


def upsert_rows(table: str, rows: list[dict]) -> list[dict]:
    return _request("POST", table, json=rows, headers={"Prefer": "resolution=merge-duplicates,return=representation"})

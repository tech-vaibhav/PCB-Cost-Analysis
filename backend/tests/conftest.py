import json
from itertools import count
from pathlib import Path

import pytest

from backend.core import supabase
from backend.core.security import make_token
from backend.models.pricing import PricingConfig
from backend.services import admins
from backend.services.pricing import store


@pytest.fixture(autouse=True)
def offline(monkeypatch):
    def boom(*a, **kw):
        raise supabase.SupabaseError("offline")
    monkeypatch.setattr(supabase, "_send", boom)
    monkeypatch.setattr(store, "_cache", None)


@pytest.fixture
def config() -> PricingConfig:
    return PricingConfig.model_validate(json.loads((Path(__file__).parent / "fixtures" / "pricing_config.json").read_text("utf-8")))


@pytest.fixture
def db(monkeypatch):
    """In-memory admin_users behind the core.supabase helpers (eq filters and select only)."""
    rows, ids = [], count(1)

    def match(params):
        eq = {k: v[3:] for k, v in params.items() if str(v).startswith("eq.")}
        return [r for r in rows if all(str(r[k]) == v for k, v in eq.items())]

    def project(hits, params):
        cols = params.get("select", "").split(",")
        return [{k: r[k] for k in cols} if params.get("select") else dict(r) for r in hits]

    def insert(t, new, params=None):
        for r in new:
            if any(x["email"] == r["email"] for x in rows):
                raise supabase.SupabaseError('{"code":"23505"}')
            rows.append({"id": f"u{next(ids)}", "status": "pending", "created_at": "2026-01-01", "last_sign_in_at": None, **r})
        return project(rows[-len(new):], params or {})

    def patch(t, params, data):
        hits = match(params)
        for r in hits:
            r.update(data)
        return project(hits, params)

    monkeypatch.setattr(supabase, "get_rows", lambda t, p: project(match(p), p))
    monkeypatch.setattr(supabase, "insert_rows", insert)
    monkeypatch.setattr(supabase, "patch_rows", patch)
    monkeypatch.setattr(supabase, "delete_rows", lambda t, p: [rows.remove(r) for r in match(p)])
    return rows


def add_admin(email: str, approved: bool = True) -> tuple[dict, dict]:
    """Create a user through the service; returns (row, auth headers)."""
    row = admins.create_pending("Test", "12345", email, "longenough", None)
    if approved:
        row = admins.approve(row["id"])
    return row, {"Authorization": f"Bearer {make_token(row['id'], row['email'])}"}

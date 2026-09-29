import time
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.services import admins
from backend.services.pricing import store
from backend.tests.conftest import add_admin

client = TestClient(app)
ZIP = Path(__file__).parent.parent / "test_files" / "Pelectro 2V1 Panel_Legend_Top.zip"
QUOTE = {
    "boardW": 130, "boardL": 80, "quantity": 275,
    "layers": "2", "orderType": "Bare PCB", "thickness": "1.6", "copper": "1",
    "material": "FR4 TG130", "maskColor": "Green", "silkscreen": "White",
    "finish": "HASL-LF", "traceSpace": "6/6", "minHole": "0.30", "ipcStd": "IPC-2",
    "testing": "FlyingProbe", "express": "Standard",
    "specials": {k: False for k in ("impedance", "blindVias", "goldFingers", "halfHole", "resinPlug", "metalEdge", "halogenFree")},
}


def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200 and r.json() == {"ok": True, "pricing": "unavailable"}


@pytest.fixture
def priced(monkeypatch, config):
    monkeypatch.setattr(store, "_cache", (time.monotonic(), config, "2026-01-01T00:00:00+00:00", {}))


def test_health_ok(priced):
    assert client.get("/api/health").json() == {"ok": True, "pricing": "ok"}


def test_quote_503_when_config_unavailable():
    for r in (client.post("/api/quote", json=QUOTE), client.get("/api/pricing/options")):
        assert r.status_code == 503 and r.json()["detail"].startswith("Pricing config is not available")


def test_parse_zip():
    with ZIP.open("rb") as f:
        r = client.post("/api/gerber/parse", files={"file": (ZIP.name, f, "application/zip")})
    assert r.status_code == 200
    dims = r.json()["dimensions"]
    assert dims["width_mm"] > 0 and dims["height_mm"] > 0


def test_parse_rejects_rar():
    r = client.post("/api/gerber/parse", files={"file": ("board.rar", b"x", "application/octet-stream")})
    assert r.status_code == 400


def test_admin_requires_token():
    assert client.get("/api/admin/pricing").status_code == 401


def test_public_quote_hides_internals(priced):
    r = client.post("/api/quote", json=QUOTE)
    assert r.status_code == 200, r.text
    body = r.json()
    assert "costPerBoard" not in body and "competitors" not in body
    assert body["pricePerBoard"] > 0


def test_quote_bad_option(priced):
    r = client.post("/api/quote", json={**QUOTE, "finish": "Gold"})
    assert r.status_code == 422


@pytest.fixture
def team(db):
    add_admin("b@x.com", approved=False)
    return add_admin("a@x.com")[1]


def test_list_users(team):
    users = client.get("/api/admin/users", headers=team).json()["users"]
    assert {(u["email"], u["status"], u["isYou"]) for u in users} == {("a@x.com", "approved", True), ("b@x.com", "pending", False)}
    assert all("password_hash" not in u for u in users)


def test_approve_user(team):
    b = admins.get_by_email("b@x.com")["id"]
    r = client.post(f"/api/admin/users/{b}/approve", headers=team)
    assert r.status_code == 200 and r.json()["status"] == "approved" and not r.json()["isYou"]
    assert client.post("/api/admin/users/nope/approve", headers=team).status_code == 404


def test_delete_user(team, db):
    me, b = admins.get_by_email("a@x.com")["id"], admins.get_by_email("b@x.com")["id"]
    r = client.delete(f"/api/admin/users/{me}", headers=team)
    assert r.status_code == 403 and r.json()["detail"] == "You cannot remove yourself"
    assert client.delete(f"/api/admin/users/{b}", headers=team).status_code == 204
    assert [r["email"] for r in db] == ["a@x.com"]


def test_pending_user_blocked(db):
    assert client.get("/api/admin/users", headers=add_admin("p@x.com", approved=False)[1]).status_code == 401


def test_supabase_down_is_502(team, monkeypatch):
    def boom():
        raise admins.supabase.SupabaseError("down")
    monkeypatch.setattr(admins, "list_users", boom)
    assert client.get("/api/admin/users", headers=team).status_code == 502

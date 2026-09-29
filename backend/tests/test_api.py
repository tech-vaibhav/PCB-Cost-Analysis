from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.core import supabase
from backend.main import app
from backend.services.pricing import store

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


@pytest.fixture(autouse=True)
def no_supabase(monkeypatch):
    def boom(*a, **kw):
        raise supabase.SupabaseError("offline")
    monkeypatch.setattr(supabase, "get_rows", boom)
    monkeypatch.setattr(store, "_cache", None)


def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200 and r.json() == {"ok": True, "configSource": "defaults"}


def test_load_config_defaults():
    cfg, source, updated = store.load_config()
    assert cfg is store.DEFAULT_CONFIG and source == "defaults" and updated is None


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


def test_public_quote_hides_internals():
    r = client.post("/api/quote", json=QUOTE)
    assert r.status_code == 200, r.text
    body = r.json()
    assert "costPerBoard" not in body and "competitors" not in body
    assert body["pricePerBoard"] > 0


def test_quote_bad_option():
    r = client.post("/api/quote", json={**QUOTE, "finish": "Gold"})
    assert r.status_code == 422

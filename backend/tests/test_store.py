import time

import pytest

from backend.core import supabase
from backend.services.pricing import store
from backend.services.pricing.tables import TABLES, config_to_rows, rows_to_config

RATE_ROWS = [{"key": "panelW", "group_name": "g", "unit": "u", "value": -1}, {"key": "legacy", "group_name": "x", "unit": "y", "value": 7}]


def table_rows(cfg):
    vals = {**cfg.rates.model_dump(), **cfg.constants.model_dump()}
    rates = [{"key": k, "group_name": "g", "unit": "u", "value": v} for k, v in vals.items()
             if k not in ("fabSource", "beatCompetitor", "markupOverridePct")]
    rows = config_to_rows(cfg, rates)
    rows["pricing_policy"][0]["updated_at"] = "2026-01-01T00:00:00+00:00"
    return rows


def test_round_trip(config):
    assert rows_to_config(table_rows(config)) == config


def test_rate_rows_keep_meta(config):
    rows = config_to_rows(config, RATE_ROWS)["pricing_rates"]
    assert rows == [{"key": "panelW", "group_name": "g", "unit": "u", "value": config.rates.panelW},
                    {"key": "legacy", "group_name": "x", "unit": "y", "value": 7}]


def test_load_raises_when_unavailable(monkeypatch):
    def boom(*a, **kw):
        raise supabase.SupabaseError("offline")
    monkeypatch.setattr(supabase, "get_rows", boom)
    with pytest.raises(store.ConfigUnavailable, match="offline"):
        store.load_config()


def test_load_from_tables(monkeypatch, config):
    rows = table_rows(config)
    monkeypatch.setattr(supabase, "get_rows", lambda t, p: rows[t])
    assert store.load_config() == (config, "2026-01-01T00:00:00+00:00")


def test_save_writes(monkeypatch, config):
    monkeypatch.setattr(store, "_cache", (time.monotonic(), config, "t", {"pricing_rates": RATE_ROWS}))
    calls = []
    monkeypatch.setattr(supabase, "delete_rows", lambda t, p: calls.append(("delete", t)))
    monkeypatch.setattr(supabase, "upsert_rows", lambda t, r: calls.append(("upsert", t, r)))
    monkeypatch.setattr(store, "load_config", lambda: None)
    store.save_config(config)
    for t in set(TABLES) - {"pricing_policy", "pricing_rates"}:
        assert [c[0] for c in calls if c[1] == t] == ["delete", "upsert"], t
    for t in ("pricing_policy", "pricing_rates"):
        ups = [c for c in calls if c[1] == t]
        assert [c[0] for c in ups] == ["upsert"] and all(r["updated_at"] for r in ups[0][2])
    order = [c[:2] for c in calls]
    assert order.index(("delete", "competitor_params")) < order.index(("delete", "competitors"))
    assert order.index(("upsert", "competitors")) < order.index(("upsert", "competitor_params"))
    rates = [c for c in calls if c[1] == "pricing_rates"][0][2]
    assert [(r["key"], r["group_name"], r["unit"]) for r in rates] == [("panelW", "g", "u"), ("legacy", "x", "y")]
    assert store._cache is None

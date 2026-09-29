import logging
import time
from datetime import datetime, timezone

from backend.core import supabase
from backend.models.pricing import PricingConfig
from backend.services.pricing.defaults import DEFAULT_CONFIG

log = logging.getLogger(__name__)
TABLE = "pricing_config"
KEYS = ("rates", "lookups", "constants")
TTL = 60
_cache: tuple[float, tuple[PricingConfig, str, str | None]] | None = None
_warned = False


def _fetch() -> tuple[PricingConfig, str, str | None]:
    global _warned
    try:
        rows = {r["key"]: r for r in supabase.get_rows(TABLE, {"select": "key,value,updated_at"})}
        if all(k in rows for k in KEYS):
            cfg = PricingConfig(**{k: rows[k]["value"] for k in KEYS})
            return cfg, "supabase", max(rows[k]["updated_at"] for k in KEYS)
        reason = "rows missing"
    except Exception as exc:  # table missing, network, bad json: all fall back
        reason = str(exc)[:200]
    if not _warned:
        log.warning("pricing_config unavailable (%s), using defaults", reason)
        _warned = True
    return DEFAULT_CONFIG, "defaults", None


def load_config() -> tuple[PricingConfig, str, str | None]:
    global _cache
    if _cache is None or time.monotonic() - _cache[0] > TTL:
        _cache = (time.monotonic(), _fetch())
    return _cache[1]


def get_config() -> PricingConfig:
    return load_config()[0]


def save_config(cfg: PricingConfig) -> tuple[PricingConfig, str, str | None]:
    global _cache, _warned
    now = datetime.now(timezone.utc).isoformat()
    data = cfg.model_dump(mode="json")
    supabase.upsert_rows(TABLE, [{"key": k, "value": data[k], "updated_at": now} for k in KEYS])
    _cache, _warned = None, False
    return load_config()


def reset_config() -> tuple[PricingConfig, str, str | None]:
    return save_config(DEFAULT_CONFIG)

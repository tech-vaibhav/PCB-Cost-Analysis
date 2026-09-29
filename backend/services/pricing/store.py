import logging
import time
from datetime import datetime, timezone

from backend.core import supabase
from backend.models.pricing import PricingConfig
from backend.services.pricing.tables import TABLES, config_to_rows, rows_to_config

log = logging.getLogger(__name__)
SORTED = {"option_factors", "delivery_speeds", "special_requirements", "form_options", "order_types", "competitors"}
PKEY = {"option_factors": "category", "delivery_speeds": "speed", "special_requirements": "key",
        "markup_tiers": "max_qty", "form_options": "category",
        "order_types": "option", "competitors": "name", "competitor_params": "competitor"}
TTL = 60
_cache: tuple[float, PricingConfig, str, dict] | None = None
_warned = False


class ConfigUnavailable(Exception):
    pass


def _fetch() -> tuple[float, PricingConfig, str, dict]:
    global _warned
    try:
        rows = {t: supabase.get_rows(t, {"select": "*", **({"order": "sort_order"} if t in SORTED else {})})
                for t in TABLES}
        if not rows["pricing_policy"]:
            raise ValueError("pricing_policy row missing")
        return time.monotonic(), rows_to_config(rows), rows["pricing_policy"][0]["updated_at"], rows
    except Exception as exc:  # tables missing, network, bad data
        reason = str(exc)[:200]
        if not _warned:
            log.warning("pricing config unavailable: %s", reason)
            _warned = True
        raise ConfigUnavailable(reason) from exc


def _load() -> tuple[float, PricingConfig, str, dict]:
    global _cache
    if _cache is None or time.monotonic() - _cache[0] > TTL:
        _cache = _fetch()
    return _cache


def load_config() -> tuple[PricingConfig, str]:
    return _load()[1:3]


def get_config() -> PricingConfig:
    return _load()[1]


def save_config(cfg: PricingConfig) -> tuple[PricingConfig, str]:
    global _cache, _warned
    rows = config_to_rows(cfg, _load()[3]["pricing_rates"])
    now = datetime.now(timezone.utc).isoformat()
    # ponytail: not transactional, a failure midway leaves a partial config; a Postgres function via rpc would make it atomic
    for t, pk in reversed(PKEY.items()):  # children before parents
        supabase.delete_rows(t, {pk: "not.is.null"})
    for t in PKEY:
        if rows[t]:
            supabase.upsert_rows(t, rows[t])
    for t in ("pricing_rates", "pricing_policy"):
        supabase.upsert_rows(t, [{**x, "updated_at": now} for x in rows[t]])
    _cache, _warned = None, False
    return load_config()

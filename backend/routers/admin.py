from fastapi import APIRouter, Depends, HTTPException

from backend.core.auth import require_admin
from backend.core.supabase import SupabaseError
from backend.models.pricing import AdminQuoteRequest, AdminQuoteResponse, PricingConfig, QuoteRequest
from backend.services.pricing.quote import apply_overrides, calculate_quote
from backend.services.pricing.store import get_config, load_config, reset_config, save_config

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(require_admin)])


def _config_response(fn, *args) -> dict:
    try:
        cfg, source, updated_at = fn(*args)
    except SupabaseError as exc:
        raise HTTPException(502, str(exc))
    return {**cfg.model_dump(mode="json"), "updatedAt": updated_at, "source": source}


@router.get("/pricing")
def get_pricing():
    return _config_response(load_config)


@router.put("/pricing")
def put_pricing(cfg: PricingConfig):
    return _config_response(save_config, cfg)


@router.post("/pricing/reset")
def reset_pricing():
    return _config_response(reset_config)


@router.post("/quote", response_model=AdminQuoteResponse)
def admin_quote(req: AdminQuoteRequest):
    try:
        cfg = apply_overrides(get_config(), req.overrides) if req.overrides else get_config()
        return calculate_quote(QuoteRequest(**req.model_dump(include=set(QuoteRequest.model_fields))), cfg)
    except ValueError as exc:
        raise HTTPException(422, str(exc))

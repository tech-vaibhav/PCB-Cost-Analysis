from fastapi import APIRouter, Depends, HTTPException

from backend.core.auth import require_admin
from backend.models.admins import AdminUser, to_admin_user
from backend.models.pricing import AdminQuoteRequest, AdminQuoteResponse, PricingConfig, QuoteRequest
from backend.services import admins
from backend.services.pricing.quote import apply_overrides, calculate_quote
from backend.services.pricing.store import get_config, load_config, save_config

# SupabaseError -> 502 and ConfigUnavailable -> 503 are handled app-wide in main.py
router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(require_admin)])


def _config_response(fn, *args) -> dict:
    cfg, updated_at = fn(*args)
    return {**cfg.model_dump(mode="json"), "updatedAt": updated_at}


@router.get("/pricing")
def get_pricing():
    return _config_response(load_config)


@router.put("/pricing")
def put_pricing(cfg: PricingConfig):
    return _config_response(save_config, cfg)


@router.post("/quote", response_model=AdminQuoteResponse)
def admin_quote(req: AdminQuoteRequest):
    try:
        cfg = apply_overrides(get_config(), req.overrides) if req.overrides else get_config()
        return calculate_quote(QuoteRequest(**req.model_dump(include=set(QuoteRequest.model_fields))), cfg)
    except ValueError as exc:
        raise HTTPException(422, str(exc))


@router.get("/users")
def get_users(me: dict = Depends(require_admin)):
    return {"users": [to_admin_user(r, me["id"]) for r in admins.list_users()]}


@router.post("/users/{user_id}/approve", response_model=AdminUser)
def approve_user(user_id: str, me: dict = Depends(require_admin)):
    row = admins.approve(user_id)
    if not row:
        raise HTTPException(404, "User not found")
    return to_admin_user(row, me["id"])


@router.delete("/users/{user_id}", status_code=204)
def remove_user(user_id: str, me: dict = Depends(require_admin)):
    if user_id == me["id"]:
        raise HTTPException(403, "You cannot remove yourself")
    admins.delete(user_id)

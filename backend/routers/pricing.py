from fastapi import APIRouter, HTTPException

from backend.models.pricing import QuoteRequest, QuoteResponse
from backend.services.pricing.options import options_from_config
from backend.services.pricing.quote import calculate_quote, public_quote
from backend.services.pricing.store import get_config

router = APIRouter(prefix="/api", tags=["pricing"])


@router.get("/pricing/options")
def options():
    return options_from_config(get_config())


@router.post("/quote", response_model=QuoteResponse)
def quote(req: QuoteRequest):
    try:
        return public_quote(calculate_quote(req, get_config()))
    except ValueError as exc:
        raise HTTPException(422, str(exc))

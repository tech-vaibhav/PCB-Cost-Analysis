import jwt
from fastapi import Header, HTTPException

from backend.core.security import decode_token
from backend.services.admins import get_by_id


def require_admin(authorization: str | None = Header(default=None)) -> dict:
    scheme, _, token = (authorization or "").partition(" ")
    try:
        user = get_by_id(decode_token(token)["sub"]) if scheme.lower() == "bearer" else None
    except (jwt.PyJWTError, KeyError):
        user = None
    if not user or user["status"] != "approved":
        raise HTTPException(401, "Not signed in")
    return user

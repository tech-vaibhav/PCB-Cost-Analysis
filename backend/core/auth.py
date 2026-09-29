import jwt
from fastapi import Header, HTTPException

from backend.core.settings import settings

_jwks = jwt.PyJWKClient(settings.supabase_jwks_url)


def require_admin(authorization: str | None = Header(default=None)) -> dict:
    scheme, _, token = (authorization or "").partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(401, "Missing bearer token")
    try:
        key = _jwks.get_signing_key_from_jwt(token).key
        claims = jwt.decode(token, key, algorithms=["ES256", "RS256"], audience="authenticated")
    except jwt.PyJWTError as exc:
        raise HTTPException(401, f"Invalid token: {exc}")
    if (claims.get("email") or "").lower() not in settings.admin_email_list:
        raise HTTPException(403, "Not an admin")
    return claims

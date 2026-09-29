from datetime import datetime, timedelta, timezone

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

from backend.core.settings import settings

_ph = PasswordHasher()


def hash_password(p: str) -> str:
    return _ph.hash(p)


def verify_password(h: str, p: str) -> bool:
    try:
        return _ph.verify(h, p)
    except (VerificationError, InvalidHashError):
        return False


def make_token(user_id: str, email: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(hours=settings.jwt_expires_hours)
    return jwt.encode({"sub": user_id, "email": email, "exp": exp}, settings.jwt_secret, algorithm="HS256")


def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])

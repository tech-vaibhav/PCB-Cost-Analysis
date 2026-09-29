from typing import Literal

from pydantic import BaseModel, Field, field_validator


class SignupRequest(BaseModel):
    name: str = Field(min_length=1)
    phone: str = Field(min_length=5)
    email: str
    password: str = Field(min_length=8)
    note: str | None = None

    @field_validator("email")
    @classmethod
    def _email(cls, v: str) -> str:
        v = v.strip().lower()
        if "@" not in v.strip("@"):
            raise ValueError("invalid email")
        return v


class SigninRequest(BaseModel):
    email: str
    password: str


class AdminUser(BaseModel):
    id: str
    name: str
    phone: str
    email: str
    note: str | None
    status: Literal["pending", "approved"]
    createdAt: str
    lastSignInAt: str | None
    isYou: bool


def to_admin_user(row: dict, caller_id: str) -> AdminUser:
    return AdminUser(
        id=row["id"], name=row["name"], phone=row["phone"], email=row["email"], note=row.get("note"),
        status=row["status"], createdAt=row["created_at"], lastSignInAt=row.get("last_sign_in_at"),
        isYou=row["id"] == caller_id,
    )

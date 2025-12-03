"""Security helpers such as shared password policy enforcement."""

from __future__ import annotations

import string
from typing import List

PASSWORD_POLICY_MIN_LENGTH = 12
PASSWORD_POLICY_MESSAGE = (
    "Password must be at least 12 characters long and include lowercase, uppercase, "
    "numeric, and special characters."
)


def password_policy_errors(password: str | None) -> List[str]:
    """Return the reasons a password fails validation (empty list if it passes)."""

    password = password or ""
    errors: List[str] = []

    if len(password) < PASSWORD_POLICY_MIN_LENGTH:
        errors.append(f"Password must be at least {PASSWORD_POLICY_MIN_LENGTH} characters long.")
    if not any(ch.islower() for ch in password):
        errors.append("Password must include at least one lowercase letter.")
    if not any(ch.isupper() for ch in password):
        errors.append("Password must include at least one uppercase letter.")
    if not any(ch.isdigit() for ch in password):
        errors.append("Password must include at least one number.")
    if not any(ch in string.punctuation for ch in password):
        errors.append("Password must include at least one special character.")
    if any(ch.isspace() for ch in password):
        errors.append("Password cannot contain whitespace characters.")

    return errors


def enforce_password_policy(password: str | None) -> None:
    """Raise ValueError if password violates the policy."""

    errors = password_policy_errors(password)
    if errors:
        raise ValueError(errors[0])

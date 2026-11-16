"""Helpers that read one setting from the environment (the root file .env)."""

import os

from django.core.exceptions import ImproperlyConfigured

TRUE_VALUES = ("true", "1", "yes")


def env_required(name: str) -> str:
    """The value of a variable that has no default. Fails with the fix when it is missing."""
    value = os.environ.get(name, "").strip()
    if not value:
        raise ImproperlyConfigured(
            f"{name} is not set. Fix: copy the line that starts with {name}= "
            "from .env.example into .env, in the root folder of the repository."
        )
    return value


def env_text(name: str, default: str = "") -> str:
    """The value of an optional variable, without outer spaces."""
    return os.environ.get(name, default).strip()


def env_bool(name: str, default: bool) -> bool:
    """True when the variable is 'true', '1' or 'yes'. The default when it is missing."""
    value = os.environ.get(name)
    if value is None or not value.strip():
        return default
    return value.strip().lower() in TRUE_VALUES


def env_list(name: str, default: str = "") -> list[str]:
    """The values of a variable that holds a list separated by commas."""
    return [item.strip() for item in os.environ.get(name, default).split(",") if item.strip()]


def env_int(name: str, default: int) -> int:
    """A whole number. The default when the variable is missing."""
    value = os.environ.get(name, "").strip()
    if not value:
        return default
    try:
        return int(value)
    except ValueError:
        raise ImproperlyConfigured(f"{name} must be a whole number. It is: {value}") from None


def env_choice(name: str, default: str, choices: tuple[str, ...]) -> str:
    """One value of a fixed list. The default when the variable is missing."""
    value = os.environ.get(name, "").strip() or default
    if value not in choices:
        raise ImproperlyConfigured(f"{name} must be one of: {', '.join(choices)}. It is: {value}")
    return value

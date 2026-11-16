"""Checks of the settings that stop a real server from starting with an unsafe value.

config/settings.py calls them when local mode is off (DJANGO_DEBUG is not True).
In local mode the sample values of .env.example work as they are.
"""

import re

from django.core.exceptions import ImproperlyConfigured

SAMPLE_VALUE_PREFIX = "sample-"

# The same two limits as the check "security.W009" of Django.
SECRET_KEY_MIN_LENGTH = 50
SECRET_KEY_MIN_DIFFERENT_CHARACTERS = 5

# A number, a slash, and the period: "10/minute".
RATE_FORM = re.compile(r"^[1-9][0-9]*/(second|minute|hour|day)$")


def refuse_unsafe_secret_key(secret_key: str) -> None:
    """Stops when DJANGO_SECRET_KEY is the sample value, is short, or repeats few characters."""
    if secret_key.startswith(SAMPLE_VALUE_PREFIX):
        raise ImproperlyConfigured(
            "DJANGO_SECRET_KEY holds the sample value of .env.example and DJANGO_DEBUG is off. "
            "Fix: set DJANGO_SECRET_KEY to a long random value of your own."
        )
    is_short = len(secret_key) < SECRET_KEY_MIN_LENGTH
    has_few_characters = len(set(secret_key)) < SECRET_KEY_MIN_DIFFERENT_CHARACTERS
    if is_short or has_few_characters:
        raise ImproperlyConfigured(
            f"DJANGO_SECRET_KEY must have {SECRET_KEY_MIN_LENGTH} characters or more, and "
            f"{SECRET_KEY_MIN_DIFFERENT_CHARACTERS} different characters or more, when "
            f"DJANGO_DEBUG is off. It has {len(secret_key)} characters. "
            "Fix: set DJANGO_SECRET_KEY to a long random value of your own."
        )


def refuse_sample_database_password(database_password: str) -> None:
    """Stops when POSTGRES_PASSWORD is the sample value of .env.example."""
    if database_password.startswith(SAMPLE_VALUE_PREFIX):
        raise ImproperlyConfigured(
            "POSTGRES_PASSWORD holds the sample value of .env.example and DJANGO_DEBUG is off. "
            "Fix: set POSTGRES_PASSWORD to the password of the real database."
        )


def checked_rate(name: str, rate: str) -> str:
    """The rate, when it has the form "<number>/<second|minute|hour|day>". Stops otherwise."""
    if not RATE_FORM.match(rate):
        raise ImproperlyConfigured(
            f'{name} must have the form "10/minute": a whole number above 0, a slash, and '
            f"one of second, minute, hour, day. It is: {rate}"
        )
    return rate

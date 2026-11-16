"""Code that changes data of the accounts: the login session, the first admin."""

from django.contrib.auth import authenticate, login, logout

from . import selectors
from .models import User, normalize_email


def log_in(request, email: str, password: str) -> User | None:
    """Starts the login session of the user with this email and password.

    Returns None, and starts nothing, when the email is unknown, the password is
    wrong or the user was turned off. The caller cannot tell which of the three.
    """
    user = authenticate(request, email=normalize_email(email), password=password)
    if user is None:
        return None
    # Gives the session a new key and the CSRF token a new value.
    login(request, user)
    return user


def log_out(request) -> None:
    """Ends the login session of the request."""
    logout(request)


def create_first_admin(email: str, password: str, name: str = "") -> tuple[User, bool]:
    """Creates the admin with this email when no user has it.

    Returns the user and True when it was created. Returns the user and False,
    and changes nothing, when a user with this email already exists.
    """
    existing = selectors.user_with_email(email)
    if existing is not None:
        return existing, False
    return User.objects.create_superuser(email=email, password=password, name=name), True

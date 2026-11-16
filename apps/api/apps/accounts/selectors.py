"""Code that reads data of the accounts."""

from django.db.models import QuerySet

from .models import User, normalize_email


def user_with_email(email: str) -> User | None:
    """The user with this email, or None. Upper and lower case are the same."""
    return User.objects.filter(email=normalize_email(email)).first()


def users() -> QuerySet[User]:
    """Every user, ordered by email. Admins and users who were turned off are included."""
    return User.objects.all()

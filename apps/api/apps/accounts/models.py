from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone


def normalize_email(email: str) -> str:
    """The form in which an email is stored and compared: no outer spaces, lower case."""
    return (email or "").strip().lower()


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create(self, email, password, **fields):
        email = normalize_email(email)
        if not email:
            raise ValueError("A user needs an email.")
        user = self.model(email=email, **fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **fields):
        fields.setdefault("is_staff", False)
        fields.setdefault("is_superuser", False)
        return self._create(email, password, **fields)

    def create_superuser(self, email, password=None, **fields):
        fields["is_staff"] = True
        fields["is_superuser"] = True
        return self._create(email, password, **fields)

    def get_by_natural_key(self, email):
        return self.get(email=normalize_email(email))


class User(AbstractBaseUser, PermissionsMixin):
    """A person who can log in. The email identifies the person; there is no username."""

    email = models.EmailField("email", unique=True)
    name = models.CharField("name", max_length=150, blank=True)
    is_staff = models.BooleanField(
        "admin",
        default=False,
        help_text="An admin can log in to the Django admin and use the internal app.",
    )
    is_active = models.BooleanField(
        "active",
        default=True,
        help_text="Turn this off, instead of deleting the user, to stop the user from logging in.",
    )
    date_joined = models.DateTimeField("date joined", default=timezone.now)

    objects = UserManager()

    EMAIL_FIELD = "email"
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    class Meta:
        verbose_name = "user"
        verbose_name_plural = "users"
        ordering = ["email"]

    def __str__(self):
        return self.email

    def clean(self):
        super().clean()
        self.email = normalize_email(self.email)

    def save(self, *args, **kwargs):
        self.email = normalize_email(self.email)
        super().save(*args, **kwargs)

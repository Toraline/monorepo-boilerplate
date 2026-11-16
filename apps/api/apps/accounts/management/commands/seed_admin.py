from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from apps.accounts import services


class Command(BaseCommand):
    help = (
        "Creates the first admin from SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD and SEED_ADMIN_NAME "
        "of .env. Changes nothing when a user with that email already exists."
    )

    def handle(self, *args, **options):
        email = settings.SEED_ADMIN_EMAIL
        password = settings.SEED_ADMIN_PASSWORD
        if not email or not password:
            raise CommandError(
                "SEED_ADMIN_EMAIL or SEED_ADMIN_PASSWORD is not set. Fix: copy the lines that "
                "start with SEED_ADMIN_ from .env.example into .env, in the root folder of the "
                "repository."
            )
        if not settings.LOCAL_MODE and password.startswith(settings.SAMPLE_VALUE_PREFIX):
            raise CommandError(
                "SEED_ADMIN_PASSWORD holds a sample value and the server is not in local mode "
                "(DJANGO_DEBUG is off). No admin was created. Fix: set SEED_ADMIN_PASSWORD to a "
                "password of your own."
            )

        user, created = services.create_first_admin(
            email=email, password=password, name=settings.SEED_ADMIN_NAME
        )
        if created:
            self.stdout.write(f"The first admin was created: {user.email}")
        else:
            self.stdout.write(f"The user {user.email} already exists. Nothing was changed.")

import sys

from django.conf import settings
from django.core.management.base import BaseCommand

from apps.core import selectors


class Command(BaseCommand):
    help = "Checks that the database answers. Prints the fix and fails when it does not."
    requires_system_checks = []

    def handle(self, *args, **options):
        if selectors.database_answers():
            return
        database = settings.DATABASES["default"]
        self.stderr.write(
            f"The database does not answer on {database['HOST']}:{database['PORT']}. "
            "Fix: start it with 'make db-up', then run the command again."
        )
        sys.exit(1)

from io import StringIO
from unittest import mock

from django.core.management import call_command
from django.test import TestCase


class CheckDatabaseTests(TestCase):
    def test_passes_when_the_database_answers(self):
        call_command("check_database")

    def test_fails_and_names_the_fix_when_the_database_does_not_answer(self):
        stderr = StringIO()
        with (
            mock.patch("apps.core.selectors.database_answers", return_value=False),
            self.assertRaises(SystemExit) as raised,
        ):
            call_command("check_database", stderr=stderr)

        self.assertEqual(raised.exception.code, 1)
        self.assertIn("make db-up", stderr.getvalue())

from unittest import mock

from django.test import TestCase
from rest_framework.test import APIClient

HEALTH = "/api/health/"


class HealthTests(TestCase):
    def test_answers_ok_when_the_database_answers(self):
        response = APIClient().get(HEALTH)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok", "database": "ok"})

    def test_says_when_the_database_does_not_answer(self):
        with mock.patch("apps.core.selectors.database_answers", return_value=False):
            response = APIClient().get(HEALTH)

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json(), {"status": "error", "database": "unavailable"})

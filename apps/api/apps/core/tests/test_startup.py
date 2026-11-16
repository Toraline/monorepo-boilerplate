"""The server refuses unsafe values outside local mode, and turns https on there."""

import json
import os
import subprocess
import sys

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.test import SimpleTestCase, TestCase, override_settings

from config.startup import (
    checked_rate,
    refuse_sample_database_password,
    refuse_unsafe_secret_key,
)

# Invented values for the tests: long enough, and not the sample values.
LONG_KEY = "invented-key-for-the-tests-0123456789-abcdefghijklmnopqrstuvwxyz"
REAL_SERVER = {
    "DJANGO_DEBUG": "False",
    "DJANGO_SECRET_KEY": LONG_KEY,
    "POSTGRES_PASSWORD": "invented-database-password-of-the-tests",
}

PRINT_SETTINGS = """
import json
import django
from django.conf import settings
django.setup()
names = [
    "SECURE_SSL_REDIRECT", "SECURE_HSTS_SECONDS", "SECURE_HSTS_INCLUDE_SUBDOMAINS",
    "SECURE_PROXY_SSL_HEADER", "SESSION_COOKIE_SECURE", "CSRF_COOKIE_SECURE",
    "LOGIN_THROTTLE_RATE",
]
print(json.dumps({name: getattr(settings, name) for name in names}))
"""


def start_with(variables: dict[str, str]) -> subprocess.CompletedProcess:
    """Loads the settings in a new Python process with these environment variables."""
    environment = {**os.environ, "DJANGO_SETTINGS_MODULE": "config.settings", **variables}
    return subprocess.run(
        [sys.executable, "-c", PRINT_SETTINGS],
        cwd=settings.BASE_DIR,
        env=environment,
        capture_output=True,
        text=True,
        check=False,
    )


def settings_with(variables: dict[str, str]) -> dict:
    result = start_with(variables)
    if result.returncode != 0:
        raise AssertionError(result.stderr)
    return json.loads(result.stdout)


class SecretKeyTests(SimpleTestCase):
    def test_a_long_key_is_accepted(self):
        refuse_unsafe_secret_key(LONG_KEY)

    def test_the_sample_key_is_refused(self):
        with self.assertRaisesMessage(ImproperlyConfigured, "holds the sample value"):
            refuse_unsafe_secret_key("sample-" + LONG_KEY)

    def test_a_key_of_1_character_is_refused(self):
        with self.assertRaisesMessage(ImproperlyConfigured, "It has 1 characters"):
            refuse_unsafe_secret_key("x")

    def test_a_key_of_49_characters_is_refused(self):
        with self.assertRaisesMessage(ImproperlyConfigured, "must have 50 characters or more"):
            refuse_unsafe_secret_key(LONG_KEY[:49])

    def test_a_long_key_of_one_repeated_character_is_refused(self):
        with self.assertRaisesMessage(ImproperlyConfigured, "5 different characters or more"):
            refuse_unsafe_secret_key("a" * 60)


class DatabasePasswordTests(SimpleTestCase):
    def test_another_password_is_accepted(self):
        refuse_sample_database_password("invented-database-password-of-the-tests")

    def test_the_sample_password_is_refused(self):
        with self.assertRaisesMessage(ImproperlyConfigured, "POSTGRES_PASSWORD holds the sample"):
            refuse_sample_database_password("sample-password-change-me")


class RateTests(SimpleTestCase):
    def test_a_rate_in_the_right_form_is_returned(self):
        self.assertEqual(checked_rate("LOGIN_THROTTLE_RATE", "10/minute"), "10/minute")

    def test_another_form_is_refused(self):
        for rate in ("", "10", "0/minute", "ten/minute", "10/week", "10 / minute"):
            with self.subTest(rate=rate):
                with self.assertRaisesMessage(ImproperlyConfigured, "LOGIN_THROTTLE_RATE must"):
                    checked_rate("LOGIN_THROTTLE_RATE", rate)


class StartOfARealServerTests(SimpleTestCase):
    """Each test loads config/settings.py in a new process, as a start of the server does."""

    def test_it_starts_with_values_of_its_own_and_turns_https_on(self):
        self.assertEqual(
            settings_with(REAL_SERVER),
            {
                "SECURE_SSL_REDIRECT": True,
                "SECURE_HSTS_SECONDS": 31536000,
                "SECURE_HSTS_INCLUDE_SUBDOMAINS": False,
                "SECURE_PROXY_SSL_HEADER": None,
                "SESSION_COOKIE_SECURE": True,
                "CSRF_COOKIE_SECURE": True,
                "LOGIN_THROTTLE_RATE": "10/minute",
            },
        )

    def test_the_variables_change_the_https_values(self):
        values = settings_with(
            {
                **REAL_SERVER,
                "SECURE_HSTS_SECONDS": "3600",
                "SECURE_HSTS_INCLUDE_SUBDOMAINS": "True",
                "TRUST_PROXY_HTTPS_HEADER": "True",
                "LOGIN_THROTTLE_RATE": "5/hour",
            }
        )

        self.assertEqual(values["SECURE_HSTS_SECONDS"], 3600)
        self.assertTrue(values["SECURE_HSTS_INCLUDE_SUBDOMAINS"])
        self.assertEqual(values["SECURE_PROXY_SSL_HEADER"], ["HTTP_X_FORWARDED_PROTO", "https"])
        self.assertEqual(values["LOGIN_THROTTLE_RATE"], "5/hour")

    def test_local_mode_keeps_http(self):
        values = settings_with({"DJANGO_DEBUG": "True", "DJANGO_SECRET_KEY": "sample-key"})

        self.assertFalse(values["SECURE_SSL_REDIRECT"])
        self.assertEqual(values["SECURE_HSTS_SECONDS"], 0)
        self.assertFalse(values["SESSION_COOKIE_SECURE"])

    def test_it_does_not_start_with_a_short_secret_key(self):
        result = start_with({**REAL_SERVER, "DJANGO_SECRET_KEY": "x"})

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("DJANGO_SECRET_KEY must have 50 characters or more", result.stderr)

    def test_it_does_not_start_with_the_sample_secret_key(self):
        result = start_with({**REAL_SERVER, "DJANGO_SECRET_KEY": "sample-" + LONG_KEY})

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("DJANGO_SECRET_KEY holds the sample value", result.stderr)

    def test_it_does_not_start_with_the_sample_database_password(self):
        result = start_with({**REAL_SERVER, "POSTGRES_PASSWORD": "sample-password-change-me"})

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("POSTGRES_PASSWORD holds the sample value", result.stderr)

    def test_it_does_not_start_with_a_login_limit_in_another_form(self):
        result = start_with({**REAL_SERVER, "LOGIN_THROTTLE_RATE": "many"})

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("LOGIN_THROTTLE_RATE must have the form", result.stderr)


@override_settings(SECURE_SSL_REDIRECT=True, SECURE_HSTS_SECONDS=3600)
class HttpsTests(TestCase):
    def test_a_request_over_http_is_sent_to_https(self):
        response = self.client.get("/api/auth/csrf/")

        self.assertEqual(response.status_code, 301)
        self.assertEqual(response.headers["Location"], "https://testserver/api/auth/csrf/")

    def test_a_request_over_https_is_answered_and_tells_the_browser_to_keep_https(self):
        response = self.client.get("/api/auth/csrf/", secure=True)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["Strict-Transport-Security"], "max-age=3600")

    def test_the_health_request_is_not_sent_to_https(self):
        response = self.client.get("/api/health/")

        self.assertNotEqual(response.status_code, 301)

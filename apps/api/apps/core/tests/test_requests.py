"""Rules that hold for every request of the server, also for the ones added later."""

import re

from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import URLResolver, get_resolver
from rest_framework.test import APIClient

# The requests that need no login. Add an address here only on purpose.
PUBLIC = {"/api/health/", "/api/auth/csrf/", "/api/auth/login/"}

README = settings.BASE_DIR / "README.md"

# The part of an address that holds the id of a row: "<int:todo_id>".
ID_PART = re.compile(r"<int:\w+>")


def api_requests() -> list[tuple[str, str]]:
    """Every (method, address) under /api/ that the server answers.

    An address that holds the id of a row is returned in the form in which the
    README writes it: /api/todos/<id>/.
    """
    found = []

    def walk(patterns, prefix):
        for pattern in patterns:
            address = prefix + str(pattern.pattern)
            if isinstance(pattern, URLResolver):
                walk(pattern.url_patterns, address)
            elif address.startswith("api/"):
                methods = getattr(pattern.callback, "cls", None).http_method_names
                address = ID_PART.sub("<id>", address)
                found.extend(
                    (method.upper(), "/" + address) for method in methods if method != "options"
                )

    walk(get_resolver().url_patterns, "")
    return found


class RequestRulesTests(TestCase):
    def test_the_server_has_requests(self):
        self.assertIn(("GET", "/api/health/"), api_requests())

    def test_every_request_needs_a_login_unless_it_is_in_the_public_list(self):
        client = APIClient()
        for method, address in api_requests():
            if address in PUBLIC:
                continue
            with self.subTest(request=f"{method} {address}"):
                response = client.generic(method, address.replace("<id>", "1"))

                self.assertEqual(response.status_code, 401)

    def test_every_request_under_api_admin_refuses_a_user_who_is_not_an_admin(self):
        user = get_user_model().objects.create_user(
            email="ana.lima@example.com", password="sample-password-of-ana-1"
        )
        client = APIClient()
        client.force_login(user)
        admin_requests = [
            (method, address)
            for method, address in api_requests()
            if address.startswith("/api/admin/")
        ]
        self.assertTrue(admin_requests)
        for method, address in admin_requests:
            with self.subTest(request=f"{method} {address}"):
                response = client.generic(method, address.replace("<id>", "1"))

                self.assertEqual(response.status_code, 403)

    def test_the_readme_lists_every_request(self):
        readme = README.read_text()
        for method, address in api_requests():
            with self.subTest(request=f"{method} {address}"):
                self.assertIn(f"`{method} {address}`", readme)

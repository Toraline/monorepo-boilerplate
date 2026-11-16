from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

User = get_user_model()

LOGIN = "/api/auth/login/"
ADMIN_LOGIN = "/admin/login/"

EMAIL = "ana.lima@example.com"
PASSWORD = "sample-password-of-ana-1"
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "sample-password-of-the-admin-1"


@override_settings(LOGIN_THROTTLE_RATE="3/minute")
class LoginLimitTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(email=EMAIL, password=PASSWORD, name="Ana Lima")
        cls.admin = User.objects.create_superuser(email=ADMIN_EMAIL, password=ADMIN_PASSWORD)

    def setUp(self):
        # The counts of the limit are kept in the cache of Django.
        cache.clear()
        self.addCleanup(cache.clear)
        self.client = APIClient()

    def log_in(self, password="not-the-password", **headers):
        return self.client.post(
            LOGIN, {"email": EMAIL, "password": password}, format="json", **headers
        )

    def admin_log_in(self, password="not-the-password"):
        return self.client.post(ADMIN_LOGIN, {"username": ADMIN_EMAIL, "password": password})

    def test_the_login_answers_429_above_the_limit(self):
        statuses = [self.log_in().status_code for _attempt in range(4)]

        self.assertEqual(statuses, [401, 401, 401, 429])

    def test_the_right_password_is_refused_too_above_the_limit(self):
        for _attempt in range(3):
            self.log_in()

        response = self.log_in(password=PASSWORD)

        self.assertEqual(response.status_code, 429)
        self.assertNotIn("sessionid", response.cookies)
        self.assertIn("Retry-After", response.headers)

    def test_another_address_has_its_own_count(self):
        for _attempt in range(3):
            self.log_in()

        response = self.log_in(password=PASSWORD, REMOTE_ADDR="203.0.113.7")

        self.assertEqual(response.status_code, 200)

    def test_a_header_that_the_caller_writes_does_not_reset_the_count(self):
        statuses = [
            self.log_in(HTTP_X_FORWARDED_FOR=f"203.0.113.{attempt}").status_code
            for attempt in range(4)
        ]

        self.assertEqual(statuses, [401, 401, 401, 429])

    def test_the_other_requests_have_no_limit(self):
        statuses = [self.client.get("/api/auth/csrf/").status_code for _attempt in range(6)]

        self.assertEqual(statuses, [200] * 6)

    def test_the_admin_login_answers_429_above_the_limit(self):
        statuses = [self.admin_log_in().status_code for _attempt in range(4)]

        # The Django admin shows its login page again, status 200, for a wrong password.
        self.assertEqual(statuses, [200, 200, 200, 429])

    def test_the_right_admin_password_is_refused_too_above_the_limit(self):
        for _attempt in range(3):
            self.admin_log_in()

        response = self.admin_log_in(password=ADMIN_PASSWORD)

        self.assertEqual(response.status_code, 429)
        self.assertNotIn("sessionid", response.cookies)

    def test_opening_the_admin_login_page_is_not_counted(self):
        statuses = [self.client.get(ADMIN_LOGIN).status_code for _attempt in range(6)]

        self.assertEqual(statuses, [200] * 6)

    def test_the_api_login_and_the_admin_login_share_one_count(self):
        self.log_in()
        self.log_in()
        self.admin_log_in()

        self.assertEqual(self.log_in().status_code, 429)
        self.assertEqual(self.admin_log_in().status_code, 429)

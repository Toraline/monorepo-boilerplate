from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

User = get_user_model()

CSRF = "/api/auth/csrf/"
LOGIN = "/api/auth/login/"
LOGOUT = "/api/auth/logout/"
ME = "/api/auth/me/"

EMAIL = "ana.lima@example.com"
PASSWORD = "sample-password-of-ana-1"
LOGIN_FAILED = {"detail": "The email or the password is not correct."}


class AuthTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(email=EMAIL, password=PASSWORD, name="Ana Lima")

    def setUp(self):
        self.client = APIClient()

    def log_in(self, email=EMAIL, password=PASSWORD):
        return self.client.post(LOGIN, {"email": email, "password": password}, format="json")


class LoginTests(AuthTestCase):
    def test_the_right_password_logs_in_and_returns_the_user(self):
        response = self.log_in()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {"id": self.user.pk, "name": "Ana Lima", "email": EMAIL, "isAdmin": False},
        )
        self.assertIn("sessionid", response.cookies)
        self.assertTrue(response.cookies["sessionid"]["httponly"])

    def test_the_email_is_not_case_sensitive(self):
        response = self.log_in(email="  Ana.Lima@Example.com ")

        self.assertEqual(response.status_code, 200)

    def test_a_wrong_password_is_refused(self):
        response = self.log_in(password="not-the-password")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json(), LOGIN_FAILED)
        self.assertNotIn("sessionid", response.cookies)

    def test_an_unknown_email_gets_the_same_answer_as_a_wrong_password(self):
        wrong_password = self.log_in(password="not-the-password")
        unknown_email = self.log_in(email="nobody@example.com")

        self.assertEqual(unknown_email.status_code, wrong_password.status_code)
        self.assertEqual(unknown_email.json(), wrong_password.json())
        self.assertNotIn("sessionid", unknown_email.cookies)

    def test_a_missing_field_is_a_bad_request(self):
        response = self.client.post(LOGIN, {"email": EMAIL}, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {"password": ["This field is required."]})


class MeTests(AuthTestCase):
    def test_returns_the_user_who_is_logged_in(self):
        self.log_in()

        response = self.client.get(ME)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {"id": self.user.pk, "name": "Ana Lima", "email": EMAIL, "isAdmin": False},
        )

    def test_says_when_the_user_is_an_admin(self):
        User.objects.create_superuser(email="admin@example.com", password=PASSWORD)
        self.log_in(email="admin@example.com")

        self.assertIs(self.client.get(ME).json()["isAdmin"], True)

    def test_is_refused_without_a_login(self):
        response = self.client.get(ME)

        self.assertEqual(response.status_code, 401)
        self.assertEqual(
            response.json(), {"detail": "Authentication credentials were not provided."}
        )


class LogoutTests(AuthTestCase):
    def test_ends_the_login(self):
        self.log_in()

        response = self.client.post(LOGOUT)

        self.assertEqual(response.status_code, 204)
        self.assertEqual(self.client.get(ME).status_code, 401)

    def test_is_refused_without_a_login(self):
        self.assertEqual(self.client.post(LOGOUT).status_code, 401)


class CsrfTokenTests(AuthTestCase):
    def test_gives_the_token_in_the_answer_and_in_the_cookie(self):
        response = self.client.get(CSRF)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["csrfToken"])
        self.assertIn("csrftoken", response.cookies)


class TurnedOffUserTests(AuthTestCase):
    def test_a_user_who_was_turned_off_cannot_log_in(self):
        wrong_password = self.log_in(password="not-the-password")
        User.objects.filter(pk=self.user.pk).update(is_active=False)

        response = self.log_in()

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json(), wrong_password.json())
        self.assertNotIn("sessionid", response.cookies)

    def test_a_login_stops_working_when_the_user_is_turned_off(self):
        self.log_in()
        self.assertEqual(self.client.get(ME).status_code, 200)
        User.objects.filter(pk=self.user.pk).update(is_active=False)

        self.assertEqual(self.client.get(ME).status_code, 401)


class CsrfProtectionTests(AuthTestCase):
    """The test client of the other classes skips the CSRF check. This one does not."""

    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=True)

    def token(self):
        return self.client.get(CSRF).json()["csrfToken"]

    def log_in_with_token(self):
        return self.client.post(
            LOGIN,
            {"email": EMAIL, "password": PASSWORD},
            format="json",
            headers={"X-CSRFToken": self.token()},
        )

    def test_login_is_refused_when_the_token_is_missing(self):
        response = self.log_in()

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json(), {"detail": "CSRF Failed: CSRF cookie not set."})
        self.assertNotIn("sessionid", response.cookies)

    def test_login_is_refused_when_the_token_is_wrong(self):
        self.token()

        response = self.client.post(
            LOGIN,
            {"email": EMAIL, "password": PASSWORD},
            format="json",
            headers={"X-CSRFToken": "not-the-token"},
        )

        self.assertEqual(response.status_code, 403)
        self.assertIn("CSRF Failed", response.json()["detail"])

    def test_login_works_with_the_token(self):
        self.assertEqual(self.log_in_with_token().status_code, 200)

    def test_logout_is_refused_when_the_token_is_missing_and_the_login_stays(self):
        self.log_in_with_token()

        response = self.client.post(LOGOUT)

        self.assertEqual(response.status_code, 403)
        self.assertEqual(self.client.get(ME).status_code, 200)

    def test_a_login_changes_the_token(self):
        token_before_login = self.token()
        self.client.post(
            LOGIN,
            {"email": EMAIL, "password": PASSWORD},
            format="json",
            headers={"X-CSRFToken": token_before_login},
        )

        old_token = self.client.post(LOGOUT, headers={"X-CSRFToken": token_before_login})
        new_token = self.client.post(LOGOUT, headers={"X-CSRFToken": self.token()})

        self.assertEqual(old_token.status_code, 403)
        self.assertEqual(new_token.status_code, 204)

    def test_requests_that_read_need_no_token(self):
        self.log_in_with_token()

        self.assertEqual(self.client.get(ME).status_code, 200)

    @override_settings(CSRF_TRUSTED_ORIGINS=["http://localhost:3000"])
    def test_a_web_app_of_the_list_may_send_requests_that_change_data(self):
        response = self.client.post(
            LOGIN,
            {"email": EMAIL, "password": PASSWORD},
            format="json",
            headers={"X-CSRFToken": self.token(), "Origin": "http://localhost:3000"},
        )

        self.assertEqual(response.status_code, 200)

    @override_settings(CSRF_TRUSTED_ORIGINS=["http://localhost:3000"])
    def test_a_page_of_another_origin_is_refused_also_with_the_token(self):
        response = self.client.post(
            LOGIN,
            {"email": EMAIL, "password": PASSWORD},
            format="json",
            headers={"X-CSRFToken": self.token(), "Origin": "http://localhost:9999"},
        )

        self.assertEqual(response.status_code, 403)
        self.assertIn("Origin checking failed", response.json()["detail"])


@override_settings(CORS_ALLOWED_ORIGINS=["http://localhost:3000"])
class CorsTests(AuthTestCase):
    def test_a_web_app_of_the_list_may_read_the_answers_with_cookies(self):
        response = self.client.get(CSRF, headers={"Origin": "http://localhost:3000"})

        self.assertEqual(response.headers["Access-Control-Allow-Origin"], "http://localhost:3000")
        self.assertEqual(response.headers["Access-Control-Allow-Credentials"], "true")

    def test_the_browser_may_send_the_token_header(self):
        response = self.client.options(
            LOGIN,
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type,x-csrftoken",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn("x-csrftoken", response.headers["Access-Control-Allow-Headers"])

    def test_a_page_of_another_origin_gets_no_permission(self):
        response = self.client.get(CSRF, headers={"Origin": "http://localhost:9999"})

        self.assertNotIn("Access-Control-Allow-Origin", response.headers)

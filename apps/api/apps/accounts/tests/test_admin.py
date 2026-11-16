from django.contrib.auth import get_user_model
from django.test import TestCase

User = get_user_model()

ADMIN_EMAIL = "admin@example.com"
PASSWORD = "sample-password-of-the-admin-1"
NEW_PASSWORD = "sample-password-of-bruno-1"


class UserAdminTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = User.objects.create_superuser(email=ADMIN_EMAIL, password=PASSWORD)

    def log_in(self):
        self.client.force_login(self.admin)

    def test_the_login_page_opens(self):
        response = self.client.get("/admin/login/")

        self.assertEqual(response.status_code, 200)

    def test_an_admin_logs_in_with_email_and_password(self):
        response = self.client.post(
            "/admin/login/?next=/admin/", {"username": ADMIN_EMAIL, "password": PASSWORD}
        )

        self.assertRedirects(response, "/admin/")

    def test_the_list_of_users_opens(self):
        self.log_in()

        response = self.client.get("/admin/accounts/user/")

        self.assertContains(response, ADMIN_EMAIL)

    def test_an_admin_creates_a_user(self):
        self.log_in()

        response = self.client.post(
            "/admin/accounts/user/add/",
            {
                "email": "Bruno@Example.com",
                "name": "Bruno Reis",
                "password1": NEW_PASSWORD,
                "password2": NEW_PASSWORD,
            },
        )

        user = User.objects.get(email="bruno@example.com")
        self.assertRedirects(response, f"/admin/accounts/user/{user.pk}/change/")
        self.assertEqual(user.name, "Bruno Reis")
        self.assertTrue(user.check_password(NEW_PASSWORD))
        self.assertTrue(user.is_active)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)

    def test_an_admin_edits_a_user_makes_the_user_an_admin_and_turns_the_user_off(self):
        user = User.objects.create_user(email="bruno@example.com", password=NEW_PASSWORD)
        self.log_in()
        change = f"/admin/accounts/user/{user.pk}/change/"
        self.assertEqual(self.client.get(change).status_code, 200)

        response = self.client.post(
            change,
            {
                "email": "bruno@example.com",
                "name": "Bruno R.",
                "is_staff": "on",
                # is_active is left out: this is how a form sends an empty checkbox.
            },
        )

        self.assertRedirects(response, "/admin/accounts/user/")
        user.refresh_from_db()
        self.assertEqual(user.name, "Bruno R.")
        self.assertTrue(user.is_staff)
        self.assertTrue(user.is_superuser)
        self.assertFalse(user.is_active)
        self.assertTrue(user.check_password(NEW_PASSWORD))

    def test_a_user_who_is_not_an_admin_cannot_open_the_django_admin(self):
        user = User.objects.create_user(email="bruno@example.com", password=NEW_PASSWORD)
        self.client.force_login(user)

        response = self.client.get("/admin/")

        self.assertRedirects(response, "/admin/login/?next=/admin/")

    def test_a_user_who_was_turned_off_cannot_log_in_to_the_django_admin(self):
        User.objects.filter(pk=self.admin.pk).update(is_active=False)

        response = self.client.post(
            "/admin/login/?next=/admin/", {"username": ADMIN_EMAIL, "password": PASSWORD}
        )

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Please enter the correct email and password")

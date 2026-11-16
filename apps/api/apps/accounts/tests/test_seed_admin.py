from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase, override_settings

User = get_user_model()

SEED = {
    "SEED_ADMIN_EMAIL": "admin@example.com",
    "SEED_ADMIN_PASSWORD": "sample-admin-password-for-local-use",
    "SEED_ADMIN_NAME": "Sample Admin",
}


def seed() -> str:
    stdout = StringIO()
    call_command("seed_admin", stdout=stdout)
    return stdout.getvalue()


@override_settings(LOCAL_MODE=True, **SEED)
class SeedAdminTests(TestCase):
    def test_creates_the_first_admin(self):
        output = seed()

        user = User.objects.get()
        self.assertEqual(user.email, "admin@example.com")
        self.assertEqual(user.name, "Sample Admin")
        self.assertTrue(user.is_staff)
        self.assertTrue(user.is_superuser)
        self.assertTrue(user.is_active)
        self.assertTrue(user.check_password("sample-admin-password-for-local-use"))
        self.assertIn("The first admin was created: admin@example.com", output)

    def test_running_it_twice_creates_one_admin_and_does_not_fail(self):
        seed()

        output = seed()

        self.assertEqual(User.objects.count(), 1)
        self.assertIn("already exists. Nothing was changed.", output)

    def test_it_does_not_change_the_password_of_an_existing_user(self):
        User.objects.create_user(email="admin@example.com", password="sample-password-of-ana-1")

        seed()

        user = User.objects.get()
        self.assertTrue(user.check_password("sample-password-of-ana-1"))
        self.assertFalse(user.is_staff)

    @override_settings(SEED_ADMIN_EMAIL="", SEED_ADMIN_PASSWORD="")
    def test_it_names_the_variables_when_they_are_missing(self):
        with self.assertRaisesMessage(CommandError, "SEED_ADMIN_EMAIL or SEED_ADMIN_PASSWORD"):
            seed()

        self.assertFalse(User.objects.exists())


@override_settings(LOCAL_MODE=False, **SEED)
class SeedAdminOutsideLocalModeTests(TestCase):
    def test_it_refuses_the_sample_password(self):
        with self.assertRaisesMessage(CommandError, "SEED_ADMIN_PASSWORD holds a sample value"):
            seed()

        self.assertFalse(User.objects.exists())

    @override_settings(SEED_ADMIN_PASSWORD="another-password-for-this-test-1")
    def test_it_accepts_a_password_that_is_not_a_sample(self):
        seed()

        self.assertTrue(User.objects.get().check_password("another-password-for-this-test-1"))

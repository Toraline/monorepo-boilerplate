from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.test import TestCase

User = get_user_model()


class UserModelTests(TestCase):
    def test_create_user_stores_the_email_in_lower_case_and_hashes_the_password(self):
        user = User.objects.create_user(
            email="  Ana.Lima@Example.com ", password="sample-password-1", name="Ana Lima"
        )

        self.assertEqual(user.email, "ana.lima@example.com")
        self.assertNotEqual(user.password, "sample-password-1")
        self.assertTrue(user.check_password("sample-password-1"))
        self.assertTrue(user.is_active)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)

    def test_create_superuser_is_an_admin(self):
        user = User.objects.create_superuser(
            email="admin@example.com", password="sample-password-1"
        )

        self.assertTrue(user.is_staff)
        self.assertTrue(user.is_superuser)

    def test_a_user_needs_an_email(self):
        with self.assertRaises(ValueError):
            User.objects.create_user(email="", password="sample-password-1")

    def test_two_users_cannot_have_the_same_email(self):
        User.objects.create_user(email="ana@example.com", password="sample-password-1")

        with self.assertRaises(IntegrityError), transaction.atomic():
            User.objects.create_user(email="ANA@example.com", password="sample-password-2")

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

User = get_user_model()

USERS = "/api/admin/users/"
PASSWORD = "sample-password-of-ana-1"


class UserListTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.bruno = User.objects.create_user(
            email="bruno.reis@example.com", password=PASSWORD, name="Bruno Reis", is_active=False
        )
        cls.ana = User.objects.create_user(
            email="ana.lima@example.com", password=PASSWORD, name="Ana Lima"
        )
        cls.admin = User.objects.create_superuser(
            email="admin@example.com", password=PASSWORD, name="Sample Admin"
        )

    def setUp(self):
        self.client = APIClient()

    def test_an_admin_gets_every_user_in_one_page_ordered_by_email(self):
        self.client.force_login(self.admin)

        response = self.client.get(USERS)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "count": 3,
                "page": 1,
                "pageSize": 20,
                "totalPages": 1,
                "results": [
                    {"id": self.admin.pk, "name": "Sample Admin", "email": "admin@example.com"},
                    {"id": self.ana.pk, "name": "Ana Lima", "email": "ana.lima@example.com"},
                    {"id": self.bruno.pk, "name": "Bruno Reis", "email": "bruno.reis@example.com"},
                ],
            },
        )

    def test_a_user_who_is_not_an_admin_is_refused(self):
        self.client.force_login(self.ana)

        response = self.client.get(USERS)

        self.assertEqual(response.status_code, 403)
        self.assertEqual(
            response.json(), {"detail": "You do not have permission to perform this action."}
        )

    def test_no_login_is_refused_with_401(self):
        self.assertEqual(self.client.get(USERS).status_code, 401)

    def test_the_list_takes_the_same_number_of_queries_for_3_users_and_for_many(self):
        self.client.force_authenticate(self.admin)
        with self.assertNumQueries(2):  # the count of the rows, and the rows
            self.client.get(USERS)
        for number in range(10):
            User.objects.create_user(email=f"user{number}@example.com", password=PASSWORD)

        with self.assertNumQueries(2):
            self.client.get(USERS)

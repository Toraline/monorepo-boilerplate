from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.todos import services
from apps.todos.models import HistoryEntry, Tag

User = get_user_model()

ALL_TODOS = "/api/admin/todos/"
HISTORY = "/api/admin/history/"
PASSWORD = "sample-password-of-ana-1"
NOT_ALLOWED = {"detail": "You do not have permission to perform this action."}


def ids(response):
    return [row["id"] for row in response.json()["results"]]


class AdminApiTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.ana = User.objects.create_user(
            email="ana.lima@example.com", password=PASSWORD, name="Ana Lima"
        )
        cls.bruno = User.objects.create_user(
            email="bruno.reis@example.com", password=PASSWORD, name="Bruno Reis"
        )
        cls.admin = User.objects.create_superuser(email="admin@example.com", password=PASSWORD)
        cls.work = Tag.objects.create(name="Work", color="#1565C0")
        cls.home = Tag.objects.create(name="Home", color="#2E7D32")
        # Created through the services, so each todo has its history entries.
        cls.milk = services.create_todo(user=cls.ana, title="Buy milk", tags=[cls.home])
        cls.report = services.create_todo(
            user=cls.ana, title="Write the report", tags=[cls.work, cls.home]
        )
        cls.bank = services.create_todo(user=cls.bruno, title="Call the bank", tags=[cls.work])
        services.set_completed(cls.report, user=cls.ana, completed=True)

    def setUp(self):
        self.client = APIClient()
        self.client.force_login(self.admin)


class AllTodosTests(AdminApiTestCase):
    def test_an_admin_gets_the_todos_of_all_users_newest_first_with_the_owner(self):
        response = self.client.get(ALL_TODOS)

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(
            {key: body[key] for key in ("count", "page", "pageSize", "totalPages")},
            {"count": 3, "page": 1, "pageSize": 20, "totalPages": 1},
        )
        self.assertEqual(ids(response), [self.bank.pk, self.report.pk, self.milk.pk])
        row = body["results"][0]
        self.assertEqual(
            row["owner"],
            {"id": self.bruno.pk, "name": "Bruno Reis", "email": "bruno.reis@example.com"},
        )
        self.assertEqual(row["tags"], [{"id": self.work.pk, "name": "Work", "color": "#1565C0"}])
        self.assertEqual((row["title"], row["completed"]), ("Call the bank", False))

    def test_the_list_can_be_filtered_by_owner(self):
        self.assertEqual(
            ids(self.client.get(ALL_TODOS, {"owner": self.ana.pk})),
            [self.report.pk, self.milk.pk],
        )

    def test_the_list_can_be_filtered_by_tag(self):
        self.assertEqual(
            ids(self.client.get(ALL_TODOS, {"tag": self.work.pk})),
            [self.bank.pk, self.report.pk],
        )

    def test_the_list_can_be_filtered_by_completed_or_not_completed(self):
        self.assertEqual(ids(self.client.get(ALL_TODOS, {"completed": "true"})), [self.report.pk])
        self.assertEqual(
            ids(self.client.get(ALL_TODOS, {"completed": "false"})),
            [self.bank.pk, self.milk.pk],
        )

    def test_the_filters_combine(self):
        response = self.client.get(
            ALL_TODOS, {"owner": self.ana.pk, "tag": self.home.pk, "completed": "false"}
        )

        self.assertEqual(ids(response), [self.milk.pk])

    def test_a_filter_that_matches_nothing_gives_an_empty_list(self):
        self.assertEqual(self.client.get(ALL_TODOS, {"owner": 999999}).json()["count"], 0)

    def test_a_wrong_filter_value_is_refused_and_names_the_filter(self):
        response = self.client.get(ALL_TODOS, {"owner": "ana", "completed": "maybe"})

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json(),
            {"owner": ["A valid integer is required."], "completed": ["Must be a valid boolean."]},
        )

    def test_the_list_is_in_pages(self):
        response = self.client.get(ALL_TODOS, {"pageSize": 2, "page": 2})

        self.assertEqual(ids(response), [self.milk.pk])
        self.assertEqual(response.json()["totalPages"], 2)

    def test_the_request_only_reads(self):
        for method in ("post", "put", "patch", "delete"):
            with self.subTest(method=method):
                self.assertEqual(getattr(self.client, method)(ALL_TODOS).status_code, 405)

    def test_the_list_takes_the_same_number_of_queries_for_3_todos_and_for_many(self):
        self.client.force_authenticate(self.admin)
        with self.assertNumQueries(3):  # the count of the rows, the todos with owners, the tags
            self.client.get(ALL_TODOS)
        for number in range(10):
            owner = User.objects.create_user(email=f"user{number}@example.com", password=PASSWORD)
            services.create_todo(user=owner, title=f"Todo {number}", tags=[self.work, self.home])

        with self.assertNumQueries(3):
            response = self.client.get(ALL_TODOS)
        self.assertEqual(len(response.json()["results"]), 13)


class HistoryTests(AdminApiTestCase):
    def test_an_admin_gets_the_entries_of_all_users_newest_first(self):
        response = self.client.get(HISTORY)

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual((body["count"], body["page"], body["pageSize"]), (4, 1, 20))
        self.assertEqual(
            [(row["kind"], row["todoTitle"]) for row in body["results"]],
            [
                ("completed", "Write the report"),
                ("created", "Call the bank"),
                ("created", "Write the report"),
                ("created", "Buy milk"),
            ],
        )
        ana = {"id": self.ana.pk, "name": "Ana Lima", "email": "ana.lima@example.com"}
        newest = body["results"][0]
        self.assertEqual(
            sorted(newest),
            sorted(["id", "kind", "createdAt", "todoId", "todoTitle", "todoOwner", "user"]),
        )
        self.assertEqual(newest["todoId"], self.report.pk)
        self.assertEqual(newest["todoOwner"], ana)
        self.assertEqual(newest["user"], ana)
        self.assertTrue(newest["createdAt"])

    def test_the_history_can_be_filtered_by_todo(self):
        rows = self.client.get(HISTORY, {"todo": self.report.pk}).json()["results"]

        self.assertEqual([row["kind"] for row in rows], ["completed", "created"])

    def test_the_history_can_be_filtered_by_user(self):
        rows = self.client.get(HISTORY, {"user": self.bruno.pk}).json()["results"]

        self.assertEqual([row["todoTitle"] for row in rows], ["Call the bank"])

    def test_the_history_can_be_filtered_by_kind(self):
        rows = self.client.get(HISTORY, {"kind": "completed"}).json()["results"]

        self.assertEqual([row["todoTitle"] for row in rows], ["Write the report"])

    def test_the_filters_combine(self):
        rows = self.client.get(
            HISTORY, {"todo": self.report.pk, "user": self.ana.pk, "kind": "created"}
        ).json()["results"]

        self.assertEqual(len(rows), 1)

    def test_a_kind_that_does_not_exist_is_refused(self):
        response = self.client.get(HISTORY, {"kind": "archived"})

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {"kind": ['"archived" is not a valid choice.']})

    def test_the_entries_of_a_deleted_todo_are_still_found_by_its_id_with_its_title(self):
        todo_id = self.milk.pk
        services.delete_todo(self.milk, user=self.ana)

        rows = self.client.get(HISTORY, {"todo": todo_id}).json()["results"]

        self.assertEqual([row["kind"] for row in rows], ["deleted", "created"])
        for row in rows:
            self.assertEqual(row["todoTitle"], "Buy milk")
            self.assertEqual(row["todoOwner"]["email"], "ana.lima@example.com")

    def test_an_entry_cannot_be_added_changed_or_deleted_through_the_requests(self):
        entry = HistoryEntry.objects.first()

        for method in ("post", "put", "patch", "delete"):
            with self.subTest(method=method):
                self.assertEqual(getattr(self.client, method)(HISTORY).status_code, 405)
        self.assertEqual(self.client.delete(f"{HISTORY}{entry.pk}/").status_code, 404)
        self.assertEqual(HistoryEntry.objects.count(), 4)

    def test_the_list_takes_the_same_number_of_queries_for_4_entries_and_for_many(self):
        self.client.force_authenticate(self.admin)
        with self.assertNumQueries(2):  # the count of the rows, the entries with their users
            self.client.get(HISTORY)
        for number in range(10):
            owner = User.objects.create_user(email=f"user{number}@example.com", password=PASSWORD)
            services.create_todo(user=owner, title=f"Todo {number}")

        with self.assertNumQueries(2):
            response = self.client.get(HISTORY)
        self.assertEqual(len(response.json()["results"]), 14)


class WhoMayCallTheAdminRequestsTests(AdminApiTestCase):
    def test_a_user_who_is_not_an_admin_is_refused_with_403(self):
        self.client.force_login(self.ana)

        for target in (ALL_TODOS, HISTORY, f"{ALL_TODOS}?owner={self.ana.pk}"):
            with self.subTest(address=target):
                response = self.client.get(target)

                self.assertEqual(response.status_code, 403)
                self.assertEqual(response.json(), NOT_ALLOWED)

    def test_no_login_is_refused_with_401(self):
        self.client.logout()

        for target in (ALL_TODOS, HISTORY):
            with self.subTest(address=target):
                self.assertEqual(self.client.get(target).status_code, 401)

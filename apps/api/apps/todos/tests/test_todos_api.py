from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.todos.models import Todo

User = get_user_model()

TODOS = "/api/todos/"
PASSWORD = "sample-password-of-ana-1"
NOT_FOUND = {"detail": "Not found."}


def address(todo, action=""):
    return f"{TODOS}{todo.pk}/{action}"


class TodoTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.ana = User.objects.create_user(email="ana.lima@example.com", password=PASSWORD)
        cls.bruno = User.objects.create_user(email="bruno.reis@example.com", password=PASSWORD)
        cls.admin = User.objects.create_superuser(email="admin@example.com", password=PASSWORD)

    def setUp(self):
        self.client = APIClient()
        self.client.force_login(self.ana)

    def todo(self, owner=None, title="Buy milk", **fields):
        return Todo.objects.create(owner=owner or self.ana, title=title, **fields)


class ListTodosTests(TodoTestCase):
    def test_a_user_gets_only_their_own_todos(self):
        own = self.todo()
        self.todo(owner=self.bruno, title="Call the bank")

        response = self.client.get(TODOS)

        self.assertEqual(response.status_code, 200)
        self.assertEqual([row["id"] for row in response.json()["results"]], [own.pk])

    def test_an_admin_gets_only_their_own_todos_too(self):
        self.todo()
        own = self.todo(owner=self.admin, title="Check the reports")
        self.client.force_login(self.admin)

        response = self.client.get(TODOS)

        self.assertEqual([row["id"] for row in response.json()["results"]], [own.pk])

    def test_the_answer_has_the_shape_of_a_page_and_of_a_todo(self):
        todo = self.todo(description="Two litres")

        body = self.client.get(TODOS).json()

        self.assertEqual(
            {key: body[key] for key in ("count", "page", "pageSize", "totalPages")},
            {"count": 1, "page": 1, "pageSize": 20, "totalPages": 1},
        )
        row = body["results"][0]
        self.assertEqual(
            {key: row[key] for key in ("id", "title", "description", "completed")},
            {"id": todo.pk, "title": "Buy milk", "description": "Two litres", "completed": False},
        )
        self.assertTrue(row["createdAt"])
        self.assertTrue(row["updatedAt"])

    def test_an_empty_list_is_one_empty_page(self):
        self.assertEqual(
            self.client.get(TODOS).json(),
            {"count": 0, "page": 1, "pageSize": 20, "totalPages": 1, "results": []},
        )

    def test_the_newest_todo_is_first(self):
        first = self.todo(title="First")
        second = self.todo(title="Second")

        rows = self.client.get(TODOS).json()["results"]

        self.assertEqual([row["id"] for row in rows], [second.pk, first.pk])

    def test_a_page_has_20_todos_and_the_next_page_has_the_rest(self):
        for number in range(25):
            self.todo(title=f"Todo {number}")

        first = self.client.get(TODOS).json()
        second = self.client.get(TODOS, {"page": 2}).json()

        self.assertEqual((first["count"], first["totalPages"]), (25, 2))
        self.assertEqual(len(first["results"]), 20)
        self.assertEqual((second["page"], len(second["results"])), (2, 5))

    def test_the_caller_can_ask_for_another_page_size_up_to_100(self):
        for number in range(3):
            self.todo(title=f"Todo {number}")

        small = self.client.get(TODOS, {"pageSize": 2}).json()
        large = self.client.get(TODOS, {"pageSize": 5000}).json()

        self.assertEqual((small["pageSize"], len(small["results"]), small["totalPages"]), (2, 2, 2))
        self.assertEqual(large["pageSize"], 100)

    def test_a_page_that_does_not_exist_is_not_found(self):
        response = self.client.get(TODOS, {"page": 9})

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json(), {"detail": "Invalid page."})

    def test_the_list_can_be_filtered_by_completed_or_not_completed(self):
        open_todo = self.todo(title="Open")
        done_todo = self.todo(title="Done", completed=True)

        done = self.client.get(TODOS, {"completed": "true"}).json()["results"]
        still_open = self.client.get(TODOS, {"completed": "false"}).json()["results"]

        self.assertEqual([row["id"] for row in done], [done_todo.pk])
        self.assertEqual([row["id"] for row in still_open], [open_todo.pk])

    def test_a_filter_value_that_is_not_true_or_false_is_refused(self):
        response = self.client.get(TODOS, {"completed": "maybe"})

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {"completed": ["Must be a valid boolean."]})


class CreateTodoTests(TodoTestCase):
    def test_creates_a_todo_that_the_user_owns(self):
        response = self.client.post(
            TODOS, {"title": "  Buy milk ", "description": "Two litres"}, format="json"
        )

        self.assertEqual(response.status_code, 201)
        todo = Todo.objects.get()
        self.assertEqual(todo.owner, self.ana)
        self.assertEqual((todo.title, todo.description), ("Buy milk", "Two litres"))
        self.assertFalse(todo.completed)
        self.assertEqual(response.json()["id"], todo.pk)

    def test_the_description_is_optional(self):
        response = self.client.post(TODOS, {"title": "Buy milk"}, format="json")

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["description"], "")

    def test_the_title_is_required_and_the_error_names_the_field(self):
        missing = self.client.post(TODOS, {"description": "Two litres"}, format="json")
        blank = self.client.post(TODOS, {"title": "   "}, format="json")

        self.assertEqual(missing.status_code, 400)
        self.assertEqual(missing.json(), {"title": ["This field is required."]})
        self.assertEqual(blank.status_code, 400)
        self.assertEqual(blank.json(), {"title": ["This field may not be blank."]})
        self.assertFalse(Todo.objects.exists())

    def test_the_title_has_at_most_200_characters(self):
        accepted = self.client.post(TODOS, {"title": "a" * 200}, format="json")
        refused = self.client.post(TODOS, {"title": "a" * 201}, format="json")

        self.assertEqual(accepted.status_code, 201)
        self.assertEqual(refused.status_code, 400)
        self.assertEqual(
            refused.json(), {"title": ["Ensure this field has no more than 200 characters."]}
        )

    def test_the_description_has_at_most_2000_characters(self):
        response = self.client.post(
            TODOS, {"title": "Buy milk", "description": "a" * 2001}, format="json"
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("description", response.json())

    def test_the_owner_cannot_be_chosen(self):
        self.client.post(TODOS, {"title": "Buy milk", "owner": self.bruno.pk}, format="json")

        self.assertEqual(Todo.objects.get().owner, self.ana)

    def test_completed_is_refused_because_it_has_its_own_requests(self):
        response = self.client.post(TODOS, {"title": "Buy milk", "completed": True}, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertIn("completed", response.json())
        self.assertFalse(Todo.objects.exists())

    def test_the_csrf_token_is_needed(self):
        client = APIClient(enforce_csrf_checks=True)
        client.force_login(self.ana)

        response = client.post(TODOS, {"title": "Buy milk"}, format="json")

        self.assertEqual(response.status_code, 403)
        self.assertFalse(Todo.objects.exists())


class ReadTodoTests(TodoTestCase):
    def test_returns_one_todo_of_the_user(self):
        todo = self.todo()

        response = self.client.get(address(todo))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["title"], "Buy milk")

    def test_an_id_that_does_not_exist_is_not_found(self):
        response = self.client.get(f"{TODOS}999999/")

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json(), NOT_FOUND)


class EditTodoTests(TodoTestCase):
    def test_changes_only_the_values_that_the_body_has(self):
        todo = self.todo(description="Two litres")

        response = self.client.patch(address(todo), {"title": "Buy bread"}, format="json")

        self.assertEqual(response.status_code, 200)
        todo.refresh_from_db()
        self.assertEqual((todo.title, todo.description), ("Buy bread", "Two litres"))
        self.assertEqual(response.json()["title"], "Buy bread")

    def test_the_description_can_be_emptied(self):
        todo = self.todo(description="Two litres")

        self.client.patch(address(todo), {"description": ""}, format="json")

        todo.refresh_from_db()
        self.assertEqual(todo.description, "")

    def test_an_empty_title_is_refused(self):
        todo = self.todo()

        response = self.client.patch(address(todo), {"title": ""}, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {"title": ["This field may not be blank."]})

    def test_completed_is_refused_because_it_has_its_own_requests(self):
        todo = self.todo()

        response = self.client.patch(address(todo), {"completed": True}, format="json")

        self.assertEqual(response.status_code, 400)
        todo.refresh_from_db()
        self.assertFalse(todo.completed)

    def test_put_is_not_offered(self):
        response = self.client.put(address(self.todo()), {"title": "Buy bread"}, format="json")

        self.assertEqual(response.status_code, 405)


class CompleteAndReopenTests(TodoTestCase):
    def test_complete_then_reopen(self):
        todo = self.todo()

        completed = self.client.post(address(todo, "complete/"))
        todo.refresh_from_db()
        self.assertEqual(completed.status_code, 200)
        self.assertIs(completed.json()["completed"], True)
        self.assertTrue(todo.completed)

        reopened = self.client.post(address(todo, "reopen/"))
        todo.refresh_from_db()
        self.assertEqual(reopened.status_code, 200)
        self.assertIs(reopened.json()["completed"], False)
        self.assertFalse(todo.completed)

    def test_completing_a_completed_todo_changes_nothing_and_answers_200(self):
        todo = self.todo(completed=True)
        changed_before = todo.updated_at

        response = self.client.post(address(todo, "complete/"))

        self.assertEqual(response.status_code, 200)
        todo.refresh_from_db()
        self.assertEqual(todo.updated_at, changed_before)


class DeleteTodoTests(TodoTestCase):
    def test_deletes_the_todo(self):
        todo = self.todo()

        response = self.client.delete(address(todo))

        self.assertEqual(response.status_code, 204)
        self.assertFalse(Todo.objects.exists())
        self.assertEqual(self.client.get(address(todo)).status_code, 404)


class TodoOfAnotherUserTests(TodoTestCase):
    """The todo of another user answers as "not found", and nothing changes."""

    def setUp(self):
        super().setUp()
        self.other = self.todo(owner=self.bruno, title="Call the bank")

    def requests(self):
        return [
            ("GET", address(self.other), None),
            ("PATCH", address(self.other), {"title": "Changed"}),
            ("POST", address(self.other, "complete/"), None),
            ("POST", address(self.other, "reopen/"), None),
            ("DELETE", address(self.other), None),
        ]

    def assert_not_found_and_unchanged(self):
        for method, target, body in self.requests():
            with self.subTest(request=f"{method} {target}"):
                response = self.client.generic(
                    method,
                    target,
                    data=b"" if body is None else b'{"title": "Changed"}',
                    content_type="application/json",
                )

                self.assertEqual(response.status_code, 404)
                self.assertEqual(response.json(), NOT_FOUND)
        self.other.refresh_from_db()
        self.assertEqual((self.other.title, self.other.completed), ("Call the bank", False))

    def test_a_user_cannot_read_or_change_it(self):
        self.assert_not_found_and_unchanged()

    def test_an_admin_cannot_read_or_change_it_through_these_requests(self):
        self.client.force_login(self.admin)

        self.assert_not_found_and_unchanged()

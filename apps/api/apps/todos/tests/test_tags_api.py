from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.test import TestCase
from rest_framework.test import APIClient

from apps.todos.models import Tag, Todo

User = get_user_model()

TAGS = "/api/tags/"
TODOS = "/api/todos/"
PASSWORD = "sample-password-of-ana-1"
NAME_TAKEN = {"name": ["A tag with this name already exists."]}
COLOR_FORMAT = {"color": ["The color must have the form #RRGGBB, for example #1A2B3C."]}


def address(tag):
    return f"{TAGS}{tag.pk}/"


class TagTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.ana = User.objects.create_user(email="ana.lima@example.com", password=PASSWORD)
        cls.bruno = User.objects.create_user(email="bruno.reis@example.com", password=PASSWORD)
        cls.admin = User.objects.create_superuser(email="admin@example.com", password=PASSWORD)
        cls.work = Tag.objects.create(name="Work", color="#1565C0")
        cls.home = Tag.objects.create(name="home", color="#2E7D32")

    def setUp(self):
        self.client = APIClient()
        self.client.force_login(self.admin)

    def as_user(self):
        self.client.force_login(self.ana)


class ListTagsTests(TagTestCase):
    def test_every_logged_in_user_gets_the_tags_in_one_page_ordered_by_name(self):
        self.as_user()

        response = self.client.get(TAGS)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "count": 2,
                "page": 1,
                "pageSize": 20,
                "totalPages": 1,
                "results": [
                    {"id": self.home.pk, "name": "home", "color": "#2E7D32"},
                    {"id": self.work.pk, "name": "Work", "color": "#1565C0"},
                ],
            },
        )

    def test_an_admin_also_gets_the_number_of_todos_of_all_users_per_tag(self):
        Todo.objects.create(owner=self.ana, title="Buy milk").tags.set([self.home])
        Todo.objects.create(owner=self.bruno, title="Call the bank").tags.set(
            [self.home, self.work]
        )

        rows = self.client.get(TAGS).json()["results"]

        self.assertEqual(
            [(row["name"], row["todoCount"]) for row in rows], [("home", 2), ("Work", 1)]
        )

    def test_the_list_takes_the_same_number_of_queries_for_1_tag_and_for_many(self):
        self.client.force_authenticate(self.admin)
        with self.assertNumQueries(2):  # the count of the rows, and the rows
            self.client.get(TAGS)
        for number in range(10):
            tag = Tag.objects.create(name=f"Tag {number}", color="#000000")
            Todo.objects.create(owner=self.ana, title=f"Todo {number}").tags.set([tag])

        with self.assertNumQueries(2):
            self.client.get(TAGS)


class CreateTagTests(TagTestCase):
    def test_an_admin_creates_a_tag(self):
        response = self.client.post(TAGS, {"name": " Urgent ", "color": "#c62828"}, format="json")

        self.assertEqual(response.status_code, 201)
        tag = Tag.objects.get(name="Urgent")
        self.assertEqual(response.json(), {"id": tag.pk, "name": "Urgent", "color": "#C62828"})

    def test_the_name_and_the_color_are_required(self):
        response = self.client.post(TAGS, {}, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json(),
            {"name": ["This field is required."], "color": ["This field is required."]},
        )

    def test_two_tags_cannot_have_the_same_name_ignoring_case_and_outer_spaces(self):
        for name in ("Work", "WORK", "  work  "):
            with self.subTest(name=name):
                response = self.client.post(TAGS, {"name": name, "color": "#000000"}, format="json")

                self.assertEqual(response.status_code, 400)
                self.assertEqual(response.json(), NAME_TAKEN)
        self.assertEqual(Tag.objects.count(), 2)

    def test_the_database_also_refuses_the_same_name_in_another_case(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            Tag.objects.create(name="WORK", color="#000000")

    def test_the_color_has_the_form_of_a_hash_and_6_hexadecimal_digits(self):
        for color in ("red", "#12345", "#1234567", "#GGGGGG", "123456", "#FFF"):
            with self.subTest(color=color):
                response = self.client.post(TAGS, {"name": "Urgent", "color": color}, format="json")

                self.assertEqual(response.status_code, 400)
                self.assertIn("color", response.json())
        self.assertEqual(
            self.client.post(TAGS, {"name": "Urgent", "color": "#GGGGGG"}, format="json").json(),
            COLOR_FORMAT,
        )
        self.assertEqual(Tag.objects.count(), 2)


class ChangeTagTests(TagTestCase):
    def test_an_admin_renames_a_tag(self):
        response = self.client.patch(address(self.work), {"name": "Office"}, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(), {"id": self.work.pk, "name": "Office", "color": "#1565C0"}
        )
        self.work.refresh_from_db()
        self.assertEqual(self.work.name, "Office")

    def test_an_admin_changes_the_color_of_a_tag(self):
        response = self.client.patch(address(self.work), {"color": "#abcdef"}, format="json")

        self.assertEqual(response.status_code, 200)
        self.work.refresh_from_db()
        self.assertEqual((self.work.name, self.work.color), ("Work", "#ABCDEF"))

    def test_a_tag_cannot_get_the_name_of_another_tag(self):
        response = self.client.patch(address(self.work), {"name": "HOME"}, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), NAME_TAKEN)

    def test_a_tag_can_keep_its_name_in_another_case(self):
        response = self.client.patch(address(self.work), {"name": "WORK"}, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["name"], "WORK")

    def test_a_wrong_color_is_refused(self):
        response = self.client.patch(address(self.work), {"color": "blue"}, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), COLOR_FORMAT)

    def test_a_tag_that_does_not_exist_is_not_found(self):
        response = self.client.patch(f"{TAGS}999999/", {"name": "Office"}, format="json")

        self.assertEqual(response.status_code, 404)


class DeleteTagTests(TagTestCase):
    def test_an_admin_deletes_a_tag(self):
        response = self.client.delete(address(self.work))

        self.assertEqual(response.status_code, 204)
        self.assertFalse(Tag.objects.filter(pk=self.work.pk).exists())

    def test_the_todos_that_had_the_tag_stay_without_it(self):
        todo = Todo.objects.create(owner=self.ana, title="Buy milk")
        todo.tags.set([self.work, self.home])
        changed_before = todo.updated_at

        self.client.delete(address(self.work))

        todo.refresh_from_db()
        self.assertEqual(list(todo.tags.all()), [self.home])
        self.assertEqual(todo.updated_at, changed_before)


class UserWhoIsNotAnAdminTests(TagTestCase):
    def test_is_refused_when_they_try_to_change_a_tag(self):
        self.as_user()

        created = self.client.post(TAGS, {"name": "Urgent", "color": "#C62828"}, format="json")
        renamed = self.client.patch(address(self.work), {"name": "Office"}, format="json")
        recolored = self.client.patch(address(self.work), {"color": "#000000"}, format="json")
        deleted = self.client.delete(address(self.work))

        for response in (created, renamed, recolored, deleted):
            self.assertEqual(response.status_code, 403)
            self.assertEqual(
                response.json(), {"detail": "You do not have permission to perform this action."}
            )
        self.assertEqual(
            list(Tag.objects.values_list("name", "color")),
            [("home", "#2E7D32"), ("Work", "#1565C0")],
        )


class TodoTagsTests(TagTestCase):
    """A user puts the shared tags on their own todos."""

    def setUp(self):
        super().setUp()
        self.as_user()

    def test_a_todo_is_created_with_tags_and_returns_them_ordered_by_name(self):
        response = self.client.post(
            TODOS, {"title": "Buy milk", "tagIds": [self.work.pk, self.home.pk]}, format="json"
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(
            response.json()["tags"],
            [
                {"id": self.home.pk, "name": "home", "color": "#2E7D32"},
                {"id": self.work.pk, "name": "Work", "color": "#1565C0"},
            ],
        )
        self.assertEqual(Todo.objects.get().tags.count(), 2)

    def test_a_todo_is_created_with_no_tags(self):
        without_the_field = self.client.post(TODOS, {"title": "Buy milk"}, format="json")
        with_an_empty_list = self.client.post(
            TODOS, {"title": "Buy bread", "tagIds": []}, format="json"
        )

        self.assertEqual(without_the_field.json()["tags"], [])
        self.assertEqual(with_an_empty_list.json()["tags"], [])

    def test_an_unknown_tag_id_is_an_error_on_the_field(self):
        response = self.client.post(
            TODOS, {"title": "Buy milk", "tagIds": [self.work.pk, 999998, 999999]}, format="json"
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json(), {"tagIds": ["These tag ids do not exist: 999998, 999999."]}
        )
        self.assertFalse(Todo.objects.exists())

    def test_a_value_that_is_not_a_list_of_numbers_is_an_error_on_the_field(self):
        response = self.client.post(TODOS, {"title": "Buy milk", "tagIds": "work"}, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertIn("tagIds", response.json())

    def test_editing_replaces_the_tags_and_an_empty_list_removes_them(self):
        todo = Todo.objects.create(owner=self.ana, title="Buy milk")
        todo.tags.set([self.work])
        target = f"{TODOS}{todo.pk}/"

        replaced = self.client.patch(target, {"tagIds": [self.home.pk]}, format="json")
        self.assertEqual([tag["name"] for tag in replaced.json()["tags"]], ["home"])

        kept = self.client.patch(target, {"title": "Buy bread"}, format="json")
        self.assertEqual([tag["name"] for tag in kept.json()["tags"]], ["home"])

        removed = self.client.patch(target, {"tagIds": []}, format="json")
        self.assertEqual(removed.json()["tags"], [])
        self.assertEqual(todo.tags.count(), 0)

    def test_an_unknown_tag_id_in_an_edit_changes_nothing(self):
        todo = Todo.objects.create(owner=self.ana, title="Buy milk")
        todo.tags.set([self.work])

        response = self.client.patch(
            f"{TODOS}{todo.pk}/", {"title": "Buy bread", "tagIds": [999999]}, format="json"
        )

        self.assertEqual(response.status_code, 400)
        todo.refresh_from_db()
        self.assertEqual(todo.title, "Buy milk")
        self.assertEqual(list(todo.tags.all()), [self.work])

    def test_the_list_can_be_filtered_by_one_tag_together_with_completed(self):
        work_open = Todo.objects.create(owner=self.ana, title="Write the report")
        work_open.tags.set([self.work, self.home])
        work_done = Todo.objects.create(owner=self.ana, title="Send the invoice", completed=True)
        work_done.tags.set([self.work])
        Todo.objects.create(owner=self.ana, title="Buy milk").tags.set([self.home])
        Todo.objects.create(owner=self.bruno, title="Call the bank").tags.set([self.work])

        by_tag = self.client.get(TODOS, {"tag": self.work.pk}).json()
        by_both = self.client.get(TODOS, {"tag": self.work.pk, "completed": "true"}).json()

        self.assertEqual([row["id"] for row in by_tag["results"]], [work_done.pk, work_open.pk])
        self.assertEqual(by_tag["count"], 2)
        self.assertEqual([row["id"] for row in by_both["results"]], [work_done.pk])

    def test_a_tag_filter_that_matches_no_tag_gives_an_empty_list(self):
        Todo.objects.create(owner=self.ana, title="Buy milk")

        self.assertEqual(self.client.get(TODOS, {"tag": 999999}).json()["count"], 0)

    def test_a_tag_filter_that_is_not_a_number_is_refused(self):
        response = self.client.get(TODOS, {"tag": "work"})

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {"tag": ["A valid integer is required."]})

    def test_the_list_takes_the_same_number_of_queries_for_1_todo_and_for_many(self):
        self.client.force_authenticate(self.ana)
        Todo.objects.create(owner=self.ana, title="Buy milk").tags.set([self.work])
        with self.assertNumQueries(3):  # the count of the rows, the todos, their tags
            self.client.get(TODOS)
        for number in range(10):
            Todo.objects.create(owner=self.ana, title=f"Todo {number}").tags.set(
                [self.work, self.home]
            )

        with self.assertNumQueries(3):
            self.client.get(TODOS)

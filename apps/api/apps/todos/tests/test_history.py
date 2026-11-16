from unittest import mock

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.todos import services
from apps.todos.models import HistoryEntry, Tag, Todo

User = get_user_model()

TODOS = "/api/todos/"
PASSWORD = "sample-password-of-ana-1"


def kinds():
    """The kinds of all entries, oldest first."""
    return list(HistoryEntry.objects.order_by("id").values_list("kind", flat=True))


class HistoryTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.ana = User.objects.create_user(email="ana.lima@example.com", password=PASSWORD)
        cls.bruno = User.objects.create_user(email="bruno.reis@example.com", password=PASSWORD)
        cls.work = Tag.objects.create(name="Work", color="#1565C0")

    def setUp(self):
        self.client = APIClient()
        self.client.force_login(self.ana)

    def create(self, **body):
        response = self.client.post(TODOS, {"title": "Buy milk", **body}, format="json")
        return response.json()["id"]


class HistoryOfTheRequestsTests(HistoryTestCase):
    def test_creating_a_todo_writes_one_entry_with_the_todo_the_kind_the_date_and_the_user(self):
        todo_id = self.create()

        entry = HistoryEntry.objects.get()
        self.assertEqual(entry.kind, "created")
        self.assertEqual(entry.todo_id, todo_id)
        self.assertEqual(entry.todo_title, "Buy milk")
        self.assertEqual(entry.todo_owner, self.ana)
        self.assertEqual(entry.user, self.ana)
        self.assertIsNotNone(entry.created_at)

    def test_editing_the_title_the_description_or_the_tags_writes_an_edited_entry(self):
        target = f"{TODOS}{self.create()}/"

        self.client.patch(target, {"title": "Buy bread"}, format="json")
        self.client.patch(target, {"description": "Two loaves"}, format="json")
        self.client.patch(target, {"tagIds": [self.work.pk]}, format="json")

        self.assertEqual(kinds(), ["created", "edited", "edited", "edited"])
        self.assertEqual(HistoryEntry.objects.first().todo_title, "Buy bread")

    def test_one_edit_of_several_fields_writes_one_entry(self):
        target = f"{TODOS}{self.create()}/"

        self.client.patch(
            target,
            {"title": "Buy bread", "description": "Two loaves", "tagIds": [self.work.pk]},
            format="json",
        )

        self.assertEqual(kinds(), ["created", "edited"])

    def test_an_edit_that_changes_no_value_writes_no_entry(self):
        target = f"{TODOS}{self.create(description='Two litres', tagIds=[self.work.pk])}/"

        self.client.patch(
            target,
            {"title": "Buy milk", "description": "Two litres", "tagIds": [self.work.pk]},
            format="json",
        )
        self.client.patch(target, {}, format="json")

        self.assertEqual(kinds(), ["created"])

    def test_completing_and_reopening_write_their_own_entries_and_no_edited_entry(self):
        target = f"{TODOS}{self.create()}/"

        self.client.post(f"{target}complete/")
        self.client.post(f"{target}reopen/")

        self.assertEqual(kinds(), ["created", "completed", "reopened"])

    def test_a_request_that_changes_nothing_writes_no_entry(self):
        target = f"{TODOS}{self.create()}/"

        self.client.post(f"{target}reopen/")
        self.client.post(f"{target}complete/")
        self.client.post(f"{target}complete/")

        self.assertEqual(kinds(), ["created", "completed"])

    def test_the_entries_of_a_deleted_todo_stay_and_show_its_title_and_its_owner(self):
        todo_id = self.create()
        self.client.post(f"{TODOS}{todo_id}/complete/")

        self.client.delete(f"{TODOS}{todo_id}/")

        self.assertFalse(Todo.objects.exists())
        self.assertEqual(kinds(), ["created", "completed", "deleted"])
        for entry in HistoryEntry.objects.all():
            self.assertEqual(entry.todo_id, todo_id)
            self.assertEqual(entry.todo_title, "Buy milk")
            self.assertEqual(entry.todo_owner, self.ana)
            self.assertEqual(entry.user, self.ana)

    def test_a_request_that_is_refused_writes_no_entry(self):
        todo_id = self.create()
        self.client.force_login(self.bruno)

        not_found = self.client.delete(f"{TODOS}{todo_id}/")
        wrong_value = self.client.post(TODOS, {"title": ""}, format="json")

        self.assertEqual((not_found.status_code, wrong_value.status_code), (404, 400))
        self.assertEqual(kinds(), ["created"])

    def test_deleting_a_tag_writes_no_entry_for_the_todos_that_had_it(self):
        self.create(tagIds=[self.work.pk])

        services.delete_tag(self.work)

        self.assertEqual(kinds(), ["created"])


class ChangeAndEntryAreSavedTogetherTests(HistoryTestCase):
    """When the entry cannot be written, the change is not saved. And the other way round."""

    def setUp(self):
        super().setUp()
        self.todo = services.create_todo(user=self.ana, title="Buy milk")
        HistoryEntry.objects.all().delete()

    def entry_fails(self):
        return mock.patch(
            "apps.todos.services.record_history", side_effect=RuntimeError("The entry failed.")
        )

    def test_a_todo_is_not_created_when_its_entry_fails(self):
        with self.entry_fails(), self.assertRaises(RuntimeError):
            services.create_todo(user=self.ana, title="Call the bank", tags=[self.work])

        self.assertEqual(list(Todo.objects.values_list("title", flat=True)), ["Buy milk"])

    def test_a_todo_is_not_edited_when_its_entry_fails(self):
        with self.entry_fails(), self.assertRaises(RuntimeError):
            services.edit_todo(self.todo, user=self.ana, title="Buy bread", tags=[self.work])

        saved = Todo.objects.get()
        self.assertEqual(saved.title, "Buy milk")
        self.assertEqual(saved.tags.count(), 0)

    def test_a_todo_is_not_completed_when_its_entry_fails(self):
        with self.entry_fails(), self.assertRaises(RuntimeError):
            services.set_completed(self.todo, user=self.ana, completed=True)

        self.assertFalse(Todo.objects.get().completed)

    def test_a_todo_is_not_deleted_when_its_entry_fails(self):
        with self.entry_fails(), self.assertRaises(RuntimeError):
            services.delete_todo(self.todo, user=self.ana)

        self.assertTrue(Todo.objects.filter(pk=self.todo.pk).exists())

    def test_no_entry_is_written_when_the_change_fails(self):
        change_fails = mock.patch.object(
            Todo, "delete", side_effect=RuntimeError("The delete failed.")
        )

        with change_fails, self.assertRaises(RuntimeError):
            services.delete_todo(self.todo, user=self.ana)

        self.assertFalse(HistoryEntry.objects.exists())

    def test_a_request_whose_entry_fails_changes_nothing(self):
        with self.entry_fails(), self.assertRaises(RuntimeError):
            self.client.post(f"{TODOS}{self.todo.pk}/complete/")

        self.assertFalse(Todo.objects.get().completed)
        self.assertFalse(HistoryEntry.objects.exists())

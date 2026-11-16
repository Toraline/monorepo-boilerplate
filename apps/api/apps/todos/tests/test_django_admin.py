from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.todos.models import HistoryEntry, Tag, Todo

User = get_user_model()

PASSWORD = "sample-password-of-the-admin-1"


class DjangoAdminTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = User.objects.create_superuser(email="admin@example.com", password=PASSWORD)
        cls.ana = User.objects.create_user(email="ana.lima@example.com", password=PASSWORD)
        cls.todo = Todo.objects.create(owner=cls.ana, title="Buy milk")

    def setUp(self):
        self.client.force_login(self.admin)


class TodoAdminTests(DjangoAdminTestCase):
    def test_the_list_shows_the_todos_of_all_users(self):
        response = self.client.get("/admin/todos/todo/")

        self.assertContains(response, "Buy milk")
        self.assertContains(response, "ana.lima@example.com")

    def test_the_page_of_a_todo_opens(self):
        response = self.client.get(f"/admin/todos/todo/{self.todo.pk}/change/")

        self.assertContains(response, "Buy milk")

    def test_a_todo_cannot_be_added_changed_or_deleted(self):
        change = f"/admin/todos/todo/{self.todo.pk}/change/"
        delete = f"/admin/todos/todo/{self.todo.pk}/delete/"

        self.assertEqual(self.client.get("/admin/todos/todo/add/").status_code, 403)
        self.assertEqual(self.client.post(change, {"title": "Changed"}).status_code, 403)
        self.assertEqual(self.client.post(delete, {"post": "yes"}).status_code, 403)
        self.todo.refresh_from_db()
        self.assertEqual(self.todo.title, "Buy milk")


class TagAdminTests(DjangoAdminTestCase):
    def test_an_admin_creates_changes_and_deletes_a_tag(self):
        self.client.post("/admin/todos/tag/add/", {"name": "Work", "color": "#1565c0"})
        tag = Tag.objects.get()
        self.assertEqual((tag.name, tag.color), ("Work", "#1565C0"))

        self.client.post(
            f"/admin/todos/tag/{tag.pk}/change/", {"name": "Office", "color": "#000000"}
        )
        tag.refresh_from_db()
        self.assertEqual((tag.name, tag.color), ("Office", "#000000"))

        self.client.post(f"/admin/todos/tag/{tag.pk}/delete/", {"post": "yes"})
        self.assertFalse(Tag.objects.exists())

    def test_the_same_name_in_another_case_and_a_wrong_color_are_refused(self):
        Tag.objects.create(name="Work", color="#1565C0")

        same_name = self.client.post("/admin/todos/tag/add/", {"name": "WORK", "color": "#000000"})
        wrong_color = self.client.post("/admin/todos/tag/add/", {"name": "Home", "color": "green"})

        self.assertContains(same_name, "A tag with this name already exists.")
        self.assertContains(wrong_color, "The color must have the form #RRGGBB")
        self.assertEqual(Tag.objects.count(), 1)


class HistoryEntryAdminTests(DjangoAdminTestCase):
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.entry = HistoryEntry.objects.create(
            todo_id=cls.todo.pk,
            todo_title="Buy milk",
            todo_owner=cls.ana,
            kind=HistoryEntry.Kind.CREATED,
            user=cls.ana,
        )

    def test_the_list_and_the_page_of_an_entry_open(self):
        list_page = self.client.get("/admin/todos/historyentry/")
        entry_page = self.client.get(f"/admin/todos/historyentry/{self.entry.pk}/change/")

        self.assertContains(list_page, "Buy milk")
        self.assertContains(entry_page, "created")

    def test_an_entry_cannot_be_added_changed_or_deleted(self):
        change = f"/admin/todos/historyentry/{self.entry.pk}/change/"
        delete = f"/admin/todos/historyentry/{self.entry.pk}/delete/"

        self.assertEqual(self.client.get("/admin/todos/historyentry/add/").status_code, 403)
        self.assertEqual(self.client.post(change, {"kind": "deleted"}).status_code, 403)
        self.assertEqual(self.client.post(delete, {"post": "yes"}).status_code, 403)
        self.entry.refresh_from_db()
        self.assertEqual(self.entry.kind, "created")

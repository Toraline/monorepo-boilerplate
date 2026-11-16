from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.todos.models import HistoryEntry, Tag, Todo

User = get_user_model()

PASSWORD = "sample-user-password-for-local-use"
ANA = "ana.lima@example.com"
BRUNO = "bruno.reis@example.com"


def seed() -> str:
    stdout = StringIO()
    call_command("seed_sample", stdout=stdout)
    return stdout.getvalue()


def counts():
    return (
        User.objects.count(),
        Tag.objects.count(),
        Todo.objects.count(),
        HistoryEntry.objects.count(),
    )


@override_settings(LOCAL_MODE=True, SEED_SAMPLE_PASSWORD=PASSWORD)
class SeedSampleTests(TestCase):
    def test_creates_2_users_who_are_not_admins_with_the_password_of_the_setting(self):
        output = seed()

        self.assertEqual(sorted(User.objects.values_list("email", flat=True)), [ANA, BRUNO])
        for user in User.objects.all():
            self.assertTrue(user.email.endswith("@example.com"))
            self.assertTrue(user.name)
            self.assertTrue(user.check_password(PASSWORD))
            self.assertFalse(user.is_staff)
            self.assertFalse(user.is_superuser)
        self.assertIn("Users: 2 created, 0 already existed.", output)

    def test_creates_the_tags(self):
        output = seed()

        self.assertEqual(
            list(Tag.objects.values_list("name", "color")),
            [("Home", "#2E7D32"), ("Urgent", "#C62828"), ("Work", "#1565C0")],
        )
        self.assertIn("Tags: 3 created, 0 already existed.", output)

    def test_creates_todos_for_each_user_some_completed_and_some_with_tags(self):
        output = seed()

        for email, total in ((ANA, 5), (BRUNO, 4)):
            todos = Todo.objects.filter(owner__email=email)
            self.assertEqual(todos.count(), total)
            self.assertTrue(todos.filter(completed=True).exists())
            self.assertTrue(todos.filter(completed=False).exists())
            self.assertTrue(todos.filter(tags__isnull=False).exists())
        self.assertIn("Todos: 9 created, 0 already existed.", output)

    def test_each_todo_has_its_history_entries(self):
        seed()

        for todo in Todo.objects.all():
            kinds = list(
                HistoryEntry.objects.filter(todo_id=todo.pk)
                .order_by("id")
                .values_list("kind", flat=True)
            )
            self.assertEqual(kinds[0], "created")
            # A todo is completed when its last completed or reopened entry says so.
            state = [kind for kind in kinds if kind in ("completed", "reopened")]
            self.assertEqual(todo.completed, bool(state) and state[-1] == "completed")
        self.assertEqual(
            {
                kind: HistoryEntry.objects.filter(kind=kind).count()
                for kind in ("created", "edited", "completed", "reopened", "deleted")
            },
            {"created": 9, "edited": 1, "completed": 4, "reopened": 1, "deleted": 0},
        )
        for entry in HistoryEntry.objects.select_related("user", "todo_owner"):
            self.assertEqual(entry.user, entry.todo_owner)

    def test_running_it_twice_does_not_duplicate_the_data(self):
        seed()
        after_the_first_run = counts()

        output = seed()

        self.assertEqual(after_the_first_run, (2, 3, 9, 15))
        self.assertEqual(counts(), after_the_first_run)
        self.assertIn("Users: 0 created, 2 already existed.", output)
        self.assertIn("Tags: 0 created, 3 already existed.", output)
        self.assertIn("Todos: 0 created, 9 already existed.", output)

    def test_it_changes_nothing_of_a_user_and_a_tag_that_already_exist(self):
        User.objects.create_user(email=ANA, password="another-password-of-ana-1", name="Ana L.")
        Tag.objects.create(name="work", color="#000000")

        seed()

        ana = User.objects.get(email=ANA)
        self.assertEqual(ana.name, "Ana L.")
        self.assertTrue(ana.check_password("another-password-of-ana-1"))
        self.assertEqual(
            list(Tag.objects.filter(name__iexact="work").values_list("color")), [("#000000",)]
        )
        self.assertEqual(Todo.objects.filter(owner=ana).count(), 5)

    def test_a_todo_that_the_user_deleted_is_created_again_and_the_others_are_not(self):
        seed()
        Todo.objects.filter(title="Buy milk and bread").delete()

        output = seed()

        self.assertEqual(Todo.objects.count(), 9)
        self.assertIn("Todos: 1 created, 8 already existed.", output)

    def test_a_sample_user_logs_in_and_gets_their_own_todos(self):
        seed()
        client = APIClient()

        login = client.post("/api/auth/login/", {"email": ANA, "password": PASSWORD}, format="json")
        todos = client.get("/api/todos/")

        self.assertEqual(login.status_code, 200)
        self.assertEqual(todos.json()["count"], 5)

    @override_settings(SEED_SAMPLE_PASSWORD="")
    def test_it_names_the_variable_when_it_is_missing(self):
        with self.assertRaisesMessage(CommandError, "SEED_SAMPLE_PASSWORD is not set"):
            seed()

        self.assertEqual(counts(), (0, 0, 0, 0))


class SeedSampleOutsideLocalModeTests(TestCase):
    @override_settings(LOCAL_MODE=False, SEED_SAMPLE_PASSWORD=PASSWORD)
    def test_it_refuses_to_run(self):
        with self.assertRaisesMessage(CommandError, "the server is not in local mode"):
            seed()

        self.assertEqual(counts(), (0, 0, 0, 0))

    @override_settings(LOCAL_MODE=False, SEED_SAMPLE_PASSWORD="another-password-for-this-test-1")
    def test_it_refuses_to_run_also_with_a_password_that_is_not_a_sample(self):
        with self.assertRaisesMessage(CommandError, "the server is not in local mode"):
            seed()

        self.assertEqual(counts(), (0, 0, 0, 0))

from django.contrib.auth import get_user_model
from django.db.models import ProtectedError
from django.test import TestCase

from apps.todos.models import Todo

User = get_user_model()


class TodoModelTests(TestCase):
    def test_a_user_who_has_todos_cannot_be_deleted(self):
        user = User.objects.create_user(email="ana.lima@example.com", password="sample-password-1")
        Todo.objects.create(owner=user, title="Buy milk")

        with self.assertRaises(ProtectedError):
            user.delete()

        self.assertTrue(Todo.objects.exists())

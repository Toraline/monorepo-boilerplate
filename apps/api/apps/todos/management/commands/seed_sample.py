from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.accounts import selectors as accounts_selectors
from apps.todos import selectors, services

# Every name, email and text below is invented.
SAMPLE_USERS = [
    {"email": "ana.lima@example.com", "name": "Ana Lima"},
    {"email": "bruno.reis@example.com", "name": "Bruno Reis"},
]

SAMPLE_TAGS = [
    {"name": "Home", "color": "#2E7D32"},
    {"name": "Work", "color": "#1565C0"},
    {"name": "Urgent", "color": "#C62828"},
]

# "then" lists what happens to the todo after it is created, in order:
# "complete", "reopen", or "edit" (which sets the description to "edit_description").
SAMPLE_TODOS = {
    "ana.lima@example.com": [
        {"title": "Buy milk and bread", "description": "For the weekend.", "tags": ["Home"]},
        {"title": "Write the monthly report", "tags": ["Work", "Urgent"], "then": ["complete"]},
        {"title": "Book the dentist", "tags": ["Home"], "then": ["complete", "reopen"]},
        {
            "title": "Plan the team lunch",
            "tags": ["Work"],
            "then": ["edit"],
            "edit_description": "Ask everyone which day they prefer.",
        },
        {"title": "Read one chapter of the book"},
    ],
    "bruno.reis@example.com": [
        {"title": "Call the bank about the card", "tags": ["Urgent"]},
        {"title": "Fix the kitchen tap", "tags": ["Home"], "then": ["complete"]},
        {"title": "Prepare the slides for Monday", "tags": ["Work"]},
        {"title": "Renew the library card", "then": ["complete"]},
    ],
}


class Command(BaseCommand):
    help = (
        "Creates invented sample data for a local machine: 2 users, 3 tags, and todos for each "
        "user with their history entries. Skips what already exists. Runs only in local mode."
    )

    def handle(self, *args, **options):
        if not settings.LOCAL_MODE:
            raise CommandError(
                "The sample data is for a local machine only, and the server is not in local "
                "mode (DJANGO_DEBUG is not True). Nothing was created."
            )
        password = settings.SEED_SAMPLE_PASSWORD
        if not password:
            raise CommandError(
                "SEED_SAMPLE_PASSWORD is not set. Fix: copy the line that starts with "
                "SEED_SAMPLE_PASSWORD= from .env.example into .env, in the root folder of the "
                "repository."
            )

        # All or nothing: a failure in the middle leaves no half of the sample data.
        with transaction.atomic():
            users, users_created = self.create_users(password)
            tags, tags_created = self.create_tags()
            todos_created = self.create_todos(users, tags)

        todos_total = sum(len(todos) for todos in SAMPLE_TODOS.values())
        self.report("Users", users_created, len(SAMPLE_USERS))
        self.report("Tags", tags_created, len(SAMPLE_TAGS))
        self.report("Todos", todos_created, todos_total)
        emails = ", ".join(user["email"] for user in SAMPLE_USERS)
        self.stdout.write(
            f"The sample users are: {emails}. A user that this command created logs in with "
            "the password of SEED_SAMPLE_PASSWORD in .env."
        )

    def report(self, what: str, created: int, total: int) -> None:
        self.stdout.write(f"{what}: {created} created, {total - created} already existed.")

    def create_users(self, password: str):
        """The sample users by email. An existing user is not changed, also not the password."""
        users = {}
        created = 0
        for sample in SAMPLE_USERS:
            user = accounts_selectors.user_with_email(sample["email"])
            if user is None:
                user = get_user_model().objects.create_user(
                    email=sample["email"], password=password, name=sample["name"]
                )
                created += 1
            users[sample["email"]] = user
        return users, created

    def create_tags(self):
        """The sample tags by name. An existing tag with the name is kept as it is."""
        tags = {}
        created = 0
        for sample in SAMPLE_TAGS:
            tag = selectors.tag_named(sample["name"])
            if tag is None:
                tag = services.create_tag(name=sample["name"], color=sample["color"])
                created += 1
            tags[sample["name"]] = tag
        return tags, created

    def create_todos(self, users, tags) -> int:
        """Creates each sample todo that its owner does not have yet, by title.

        The todos are created and changed through the services, as the requests
        do, so each one gets its history entries.
        """
        created = 0
        for email, samples in SAMPLE_TODOS.items():
            user = users[email]
            titles = set(selectors.todos_of(user).values_list("title", flat=True))
            for sample in samples:
                if sample["title"] in titles:
                    continue
                todo = services.create_todo(
                    user=user,
                    title=sample["title"],
                    description=sample.get("description", ""),
                    tags=[tags[name] for name in sample.get("tags", [])],
                )
                for step in sample.get("then", []):
                    if step == "edit":
                        services.edit_todo(todo, user=user, description=sample["edit_description"])
                    else:
                        services.set_completed(todo, user=user, completed=step == "complete")
                created += 1
        return created

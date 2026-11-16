from django.conf import settings
from django.core.validators import RegexValidator
from django.db import models
from django.db.models.functions import Lower

TITLE_MAX_LENGTH = 200
DESCRIPTION_MAX_LENGTH = 2000
TAG_NAME_MAX_LENGTH = 50
# How many tags one request may put on a todo.
TAG_IDS_MAX_LENGTH = 50

TAG_NAME_TAKEN = "A tag with this name already exists."

# The one form of a color: "#" and 6 hexadecimal digits (red, green, blue).
validate_color = RegexValidator(
    regex=r"^#[0-9A-Fa-f]{6}$",
    message="The color must have the form #RRGGBB, for example #1A2B3C.",
)


class Tag(models.Model):
    """A label that users put on their todos. All users share the tags; an admin changes them."""

    name = models.CharField("name", max_length=TAG_NAME_MAX_LENGTH)
    color = models.CharField(
        "color", max_length=7, validators=[validate_color], help_text="In the form #RRGGBB."
    )

    class Meta:
        verbose_name = "tag"
        verbose_name_plural = "tags"
        # By name, where upper and lower case are the same.
        ordering = [Lower("name"), "id"]
        constraints = [
            # "Work" and "work" are the same name.
            models.UniqueConstraint(
                Lower("name"),
                name="tag_name_unique_ignoring_case",
                violation_error_message=TAG_NAME_TAKEN,
            )
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        self.name = (self.name or "").strip()
        self.color = (self.color or "").upper()
        super().save(*args, **kwargs)


class Todo(models.Model):
    """One thing that a user wants to do. Only its owner reads and changes it."""

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name="owner",
        # A user who has todos cannot be deleted. Turn the user off instead.
        on_delete=models.PROTECT,
        related_name="todos",
    )
    title = models.CharField("title", max_length=TITLE_MAX_LENGTH)
    description = models.TextField("description", max_length=DESCRIPTION_MAX_LENGTH, blank=True)
    completed = models.BooleanField("completed", default=False)
    # Deleting a tag removes it from the todos. The todos stay.
    tags = models.ManyToManyField(Tag, verbose_name="tags", related_name="todos", blank=True)
    created_at = models.DateTimeField("date created", auto_now_add=True)
    updated_at = models.DateTimeField("date last changed", auto_now=True)

    class Meta:
        verbose_name = "todo"
        verbose_name_plural = "todos"
        # Newest first. The id decides between two todos of the same moment.
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return self.title


class HistoryEntry(models.Model):
    """One change of a todo: what happened, when, and who did it. It is never changed or deleted."""

    class Kind(models.TextChoices):
        CREATED = "created", "created"
        EDITED = "edited", "edited"
        COMPLETED = "completed", "completed"
        REOPENED = "reopened", "reopened"
        DELETED = "deleted", "deleted"

    # A plain number and not a foreign key: the entry stays as it is when the todo is deleted.
    todo_id = models.BigIntegerField("todo id", db_index=True)
    # The title of the todo right after the change. For "deleted": the title it had.
    todo_title = models.CharField("todo title", max_length=TITLE_MAX_LENGTH)
    todo_owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name="todo owner",
        on_delete=models.PROTECT,
        related_name="+",
    )
    kind = models.CharField("kind of change", max_length=10, choices=Kind.choices)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name="changed by",
        on_delete=models.PROTECT,
        related_name="+",
    )
    created_at = models.DateTimeField("date", auto_now_add=True)

    class Meta:
        verbose_name = "history entry"
        verbose_name_plural = "history entries"
        # Newest first. The id decides between two entries of the same moment.
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"{self.kind}: {self.todo_title}"

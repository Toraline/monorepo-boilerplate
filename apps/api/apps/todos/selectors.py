"""Code that reads todos, tags and history entries."""

from django.db.models import Count, QuerySet
from django.db.models.functions import Lower

from .models import HistoryEntry, Tag, Todo


def todos_of(user) -> QuerySet[Todo]:
    """The todos that this user owns, newest first, with their tags."""
    return Todo.objects.filter(owner=user).prefetch_related("tags")


def todo_of(user, todo_id: int) -> Todo | None:
    """The todo with this id when this user owns it. None otherwise."""
    return todos_of(user).filter(pk=todo_id).first()


def all_todos() -> QuerySet[Todo]:
    """The todos of all users, newest first, with their owner and their tags."""
    return Todo.objects.select_related("owner").prefetch_related("tags")


def filter_todos(
    todos: QuerySet[Todo],
    *,
    completed: bool | None = None,
    tag: int | None = None,
    owner: int | None = None,
) -> QuerySet[Todo]:
    """Keeps the todos that match each filter that is not None.

    "tag" is the id of a tag. "owner" is the id of a user.
    """
    if owner is not None:
        todos = todos.filter(owner_id=owner)
    if completed is not None:
        todos = todos.filter(completed=completed)
    if tag is not None:
        todos = todos.filter(tags__pk=tag)
    return todos


def tags() -> QuerySet[Tag]:
    """Every tag, ordered by name."""
    return Tag.objects.all()


def tags_with_todo_count() -> QuerySet[Tag]:
    """Every tag, ordered by name, with todo_count: how many todos of all users have the tag."""
    # Django does not apply the order of the model to a query that counts per row.
    return Tag.objects.annotate(todo_count=Count("todos")).order_by(Lower("name"), "id")


def tag_with_id(tag_id: int) -> Tag | None:
    return Tag.objects.filter(pk=tag_id).first()


def tags_with_ids(tag_ids: list[int]) -> QuerySet[Tag]:
    """The tags that exist among these ids."""
    return Tag.objects.filter(pk__in=tag_ids)


def tag_named(name: str) -> Tag | None:
    """The tag with this name, or None. Upper and lower case, and outer spaces, are ignored."""
    return Tag.objects.filter(name__iexact=(name or "").strip()).first()


def history(
    *, todo: int | None = None, user: int | None = None, kind: str | None = None
) -> QuerySet[HistoryEntry]:
    """The history entries, newest first, that match each filter that is not None.

    "todo" is the id of a todo, also of a deleted one. "user" is the id of the
    user who made the change.
    """
    entries = HistoryEntry.objects.select_related("todo_owner", "user")
    if todo is not None:
        entries = entries.filter(todo_id=todo)
    if user is not None:
        entries = entries.filter(user_id=user)
    if kind is not None:
        entries = entries.filter(kind=kind)
    return entries

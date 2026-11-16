"""Code that changes todos and tags.

Each change of a todo writes one history entry. The change and its entry are
saved in one database transaction: when one fails, neither is saved.
"""

from collections.abc import Iterable

from django.db import transaction

from .models import HistoryEntry, Tag, Todo


def record_history(todo: Todo, kind: str, user) -> HistoryEntry:
    """Writes the entry of one change of a todo. "user" is who made the change."""
    return HistoryEntry.objects.create(
        todo_id=todo.pk,
        todo_title=todo.title,
        todo_owner_id=todo.owner_id,
        kind=kind,
        user=user,
    )


@transaction.atomic
def create_todo(*, user, title: str, description: str = "", tags: Iterable[Tag] = ()) -> Todo:
    """Creates a todo that this user owns. It starts as not completed."""
    todo = Todo.objects.create(owner=user, title=title, description=description)
    todo.tags.set(tags)
    record_history(todo, HistoryEntry.Kind.CREATED, user)
    return todo


@transaction.atomic
def edit_todo(
    todo: Todo,
    *,
    user,
    title: str | None = None,
    description: str | None = None,
    tags: Iterable[Tag] | None = None,
) -> Todo:
    """Changes each value that is not None. "user" is who makes the change.

    "tags" replaces the tags of the todo: an empty list removes all of them.
    Saves nothing, and writes no history entry, when no value differs.
    """
    changed = False
    if title is not None and title != todo.title:
        todo.title = title
        changed = True
    if description is not None and description != todo.description:
        todo.description = description
        changed = True
    if tags is not None:
        tags = list(tags)
        if {tag.pk for tag in tags} != set(todo.tags.values_list("pk", flat=True)):
            todo.tags.set(tags)
            changed = True
    if changed:
        # Also sets the date of the last change when only the tags changed.
        todo.save()
        record_history(todo, HistoryEntry.Kind.EDITED, user)
    return todo


@transaction.atomic
def set_completed(todo: Todo, *, user, completed: bool) -> Todo:
    """Completes or reopens the todo. "user" is who makes the change.

    Saves nothing, and writes no history entry, when it is already in that state.
    """
    if todo.completed != completed:
        todo.completed = completed
        todo.save()
        kind = HistoryEntry.Kind.COMPLETED if completed else HistoryEntry.Kind.REOPENED
        record_history(todo, kind, user)
    return todo


@transaction.atomic
def delete_todo(todo: Todo, *, user) -> None:
    """Deletes the todo. Its history entries stay, with its id, its title and its owner."""
    record_history(todo, HistoryEntry.Kind.DELETED, user)
    todo.delete()


def create_tag(*, name: str, color: str) -> Tag:
    return Tag.objects.create(name=name, color=color)


def edit_tag(tag: Tag, *, name: str | None = None, color: str | None = None) -> Tag:
    """Renames the tag, changes its color, or both. A value that is None stays."""
    if name is not None:
        tag.name = name
    if color is not None:
        tag.color = color
    tag.save()
    return tag


def delete_tag(tag: Tag) -> None:
    """Deletes the tag. The todos that had it stay, without it. No history entry is written."""
    tag.delete()

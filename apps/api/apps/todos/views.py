from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response

from apps.core.pagination import paged_response
from apps.core.permissions import IsAdminOrReadOnly

from . import selectors, services
from .serializers import (
    AdminTodoFilterSerializer,
    AdminTodoSerializer,
    HistoryEntrySerializer,
    HistoryFilterSerializer,
    TagSerializer,
    TagWithTodoCountSerializer,
    TodoFilterSerializer,
    TodoSerializer,
    TodoWriteSerializer,
)


def own_todo(request, todo_id: int):
    """The todo with this id when the user of the request owns it.

    The todo of another user answers as "not found", the same as an id that
    does not exist, so the answer does not say which ids exist.
    """
    todo = selectors.todo_of(request.user, todo_id)
    if todo is None:
        raise NotFound()
    return todo


@api_view(["GET", "POST"])
def todos(request):
    """GET: the todos of the user who is logged in, in pages. POST: creates a todo for that user."""
    if request.method == "POST":
        serializer = TodoWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        todo = services.create_todo(user=request.user, **serializer.validated_data)
        return Response(TodoSerializer(todo).data, status=status.HTTP_201_CREATED)

    filters = TodoFilterSerializer(data=request.query_params.dict())
    filters.is_valid(raise_exception=True)
    found = selectors.filter_todos(selectors.todos_of(request.user), **filters.validated_data)
    return paged_response(request, found, TodoSerializer)


@api_view(["GET", "PATCH", "DELETE"])
def todo(request, todo_id):
    """GET: one todo. PATCH: changes the values that the body has. DELETE: deletes it."""
    todo = own_todo(request, todo_id)
    if request.method == "DELETE":
        services.delete_todo(todo, user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)
    if request.method == "PATCH":
        serializer = TodoWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        todo = services.edit_todo(todo, user=request.user, **serializer.validated_data)
    return Response(TodoSerializer(todo).data)


@api_view(["POST"])
def complete(request, todo_id):
    todo = services.set_completed(own_todo(request, todo_id), user=request.user, completed=True)
    return Response(TodoSerializer(todo).data)


@api_view(["POST"])
def reopen(request, todo_id):
    todo = services.set_completed(own_todo(request, todo_id), user=request.user, completed=False)
    return Response(TodoSerializer(todo).data)


@api_view(["GET", "POST"])
@permission_classes([IsAdminOrReadOnly])
def tags(request):
    """GET: every tag, in pages, for every logged-in user. POST: creates a tag; admin only."""
    if request.method == "POST":
        serializer = TagSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tag = services.create_tag(**serializer.validated_data)
        return Response(TagSerializer(tag).data, status=status.HTTP_201_CREATED)

    # Only an admin gets the number of todos per tag: it counts the todos of all users.
    if request.user.is_staff:
        return paged_response(request, selectors.tags_with_todo_count(), TagWithTodoCountSerializer)
    return paged_response(request, selectors.tags(), TagSerializer)


@api_view(["PATCH", "DELETE"])
@permission_classes([IsAdminUser])
def tag(request, tag_id):
    """PATCH: renames the tag, changes its color, or both. DELETE: deletes it. Admin only."""
    tag = selectors.tag_with_id(tag_id)
    if tag is None:
        raise NotFound()
    if request.method == "DELETE":
        services.delete_tag(tag)
        return Response(status=status.HTTP_204_NO_CONTENT)
    serializer = TagSerializer(tag, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    tag = services.edit_tag(tag, **serializer.validated_data)
    return Response(TagSerializer(tag).data)


@api_view(["GET"])
@permission_classes([IsAdminUser])
def all_todos(request):
    """The todos of all users, in pages, each with its owner. Admin only. Changes nothing."""
    filters = AdminTodoFilterSerializer(data=request.query_params.dict())
    filters.is_valid(raise_exception=True)
    found = selectors.filter_todos(selectors.all_todos(), **filters.validated_data)
    return paged_response(request, found, AdminTodoSerializer)


@api_view(["GET"])
@permission_classes([IsAdminUser])
def history(request):
    """The history entries of all todos, newest first, in pages. Admin only. Changes nothing."""
    filters = HistoryFilterSerializer(data=request.query_params.dict())
    filters.is_valid(raise_exception=True)
    entries = selectors.history(**filters.validated_data)
    return paged_response(request, entries, HistoryEntrySerializer)

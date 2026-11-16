from django.contrib import admin

from .models import HistoryEntry, Tag, Todo


class ReadOnlyAdmin(admin.ModelAdmin):
    """Pages of the Django admin that show rows and change nothing."""

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Todo)
class TodoAdmin(ReadOnlyAdmin):
    """An admin sees the todos of all users here. Only the owner changes a todo."""

    list_display = ("title", "owner", "completed", "created_at", "updated_at")
    list_filter = ("completed", "owner", "tags")
    search_fields = ("title", "description", "owner__email")
    list_select_related = ("owner",)


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    """An admin creates, renames, recolors and deletes the tags here or in the internal app."""

    list_display = ("name", "color")
    search_fields = ("name",)


@admin.register(HistoryEntry)
class HistoryEntryAdmin(ReadOnlyAdmin):
    """The changes of the todos of all users. An entry is never changed or deleted."""

    list_display = ("created_at", "kind", "todo_title", "todo_id", "todo_owner", "user")
    list_filter = ("kind", "user")
    search_fields = ("todo_title",)
    list_select_related = ("todo_owner", "user")

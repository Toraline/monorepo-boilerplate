from rest_framework import serializers

from apps.accounts.serializers import UserSummarySerializer

from . import selectors
from .models import (
    DESCRIPTION_MAX_LENGTH,
    TAG_IDS_MAX_LENGTH,
    TAG_NAME_TAKEN,
    TITLE_MAX_LENGTH,
    HistoryEntry,
    Tag,
    Todo,
)


class TagSerializer(serializers.ModelSerializer):
    """A tag in an answer, and what the requests that create and change a tag accept."""

    class Meta:
        model = Tag
        fields = ["id", "name", "color"]

    def validate_name(self, name):
        # Upper and lower case are the same name. The tag that is being changed may keep its name.
        same_name = selectors.tag_named(name)
        if same_name is not None and same_name != self.instance:
            raise serializers.ValidationError(TAG_NAME_TAKEN)
        return name

    def validate_color(self, color):
        return color.upper()


class TagWithTodoCountSerializer(TagSerializer):
    """A tag as an admin gets it: with the number of todos, of all users, that have the tag."""

    todoCount = serializers.IntegerField(source="todo_count", read_only=True)

    class Meta(TagSerializer.Meta):
        fields = [*TagSerializer.Meta.fields, "todoCount"]


class TodoSerializer(serializers.ModelSerializer):
    """What the server says about a todo to its owner."""

    tags = TagSerializer(many=True, read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = Todo
        fields = ["id", "title", "description", "completed", "tags", "createdAt", "updatedAt"]
        read_only_fields = fields


class TodoWriteSerializer(serializers.Serializer):
    """What the requests that create and edit a todo accept."""

    title = serializers.CharField(max_length=TITLE_MAX_LENGTH)
    description = serializers.CharField(
        max_length=DESCRIPTION_MAX_LENGTH, required=False, allow_blank=True
    )
    # The ids of the tags of the todo. The validated value is the list of the tags.
    tagIds = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        source="tags",
        max_length=TAG_IDS_MAX_LENGTH,
    )

    def validate_tagIds(self, tag_ids):
        tags = list(selectors.tags_with_ids(tag_ids))
        unknown = sorted(set(tag_ids) - {tag.pk for tag in tags})
        if unknown:
            raise serializers.ValidationError(
                f"These tag ids do not exist: {', '.join(str(tag_id) for tag_id in unknown)}."
            )
        return tags

    def validate(self, attrs):
        # Completing has its own requests. A "completed" that is silently
        # ignored would look like a bug of the server to the caller.
        if "completed" in self.initial_data:
            raise serializers.ValidationError(
                {"completed": ["Use the requests complete and reopen to change this field."]}
            )
        return attrs


class TodoFilterSerializer(serializers.Serializer):
    """The filters of the todo list, read from the address: ?completed=true&tag=3."""

    completed = serializers.BooleanField(required=False)
    tag = serializers.IntegerField(required=False)


class AdminTodoSerializer(TodoSerializer):
    """A todo as an admin gets it: with its owner."""

    owner = UserSummarySerializer(read_only=True)

    class Meta(TodoSerializer.Meta):
        fields = [*TodoSerializer.Meta.fields, "owner"]
        read_only_fields = fields


class AdminTodoFilterSerializer(TodoFilterSerializer):
    """The filters of the list of the todos of all users: ?owner=4&tag=3&completed=false."""

    owner = serializers.IntegerField(required=False)


class HistoryEntrySerializer(serializers.ModelSerializer):
    """One change of a todo, as an admin gets it."""

    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    todoId = serializers.IntegerField(source="todo_id", read_only=True)
    todoTitle = serializers.CharField(source="todo_title", read_only=True)
    todoOwner = UserSummarySerializer(source="todo_owner", read_only=True)
    user = UserSummarySerializer(read_only=True)

    class Meta:
        model = HistoryEntry
        fields = ["id", "kind", "createdAt", "todoId", "todoTitle", "todoOwner", "user"]
        read_only_fields = fields


class HistoryFilterSerializer(serializers.Serializer):
    """The filters of the history: ?todo=7&user=4&kind=deleted."""

    todo = serializers.IntegerField(required=False)
    user = serializers.IntegerField(required=False)
    kind = serializers.ChoiceField(choices=HistoryEntry.Kind.choices, required=False)

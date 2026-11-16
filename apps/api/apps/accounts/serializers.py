from rest_framework import serializers

from .models import User


class LoginSerializer(serializers.Serializer):
    """What the login request accepts."""

    # A plain text field: an email in a wrong form gets the same answer as an unknown email.
    email = serializers.CharField()
    password = serializers.CharField(trim_whitespace=False)


class UserSerializer(serializers.ModelSerializer):
    """What the server says about a user to the web apps."""

    isAdmin = serializers.BooleanField(source="is_staff", read_only=True)

    class Meta:
        model = User
        fields = ["id", "name", "email", "isAdmin"]
        read_only_fields = fields


class UserSummarySerializer(serializers.ModelSerializer):
    """The short form of a user: who owns a todo, who made a change, one row of the user list."""

    class Meta:
        model = User
        fields = ["id", "name", "email"]
        read_only_fields = fields

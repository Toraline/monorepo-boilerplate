from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from django.contrib.auth.forms import BaseUserCreationForm
from django.contrib.auth.forms import UserChangeForm as DjangoUserChangeForm

from .models import User


class UserCreationForm(BaseUserCreationForm):
    """The form "Add user": email, name, the password twice."""

    class Meta:
        model = User
        fields = ("email", "name")
        field_classes = {}


class UserChangeForm(DjangoUserChangeForm):
    class Meta:
        model = User
        fields = "__all__"
        field_classes = {}


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    """Users are created, edited and turned off here. There is no sign-up."""

    add_form = UserCreationForm
    form = UserChangeForm

    list_display = ("email", "name", "is_staff", "is_active")
    list_filter = ("is_staff", "is_active")
    search_fields = ("email", "name")
    ordering = ("email",)
    readonly_fields = ("last_login", "date_joined")

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Person", {"fields": ("name",)}),
        ("Access", {"fields": ("is_active", "is_staff")}),
        ("Dates", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "name", "password1", "password2", "is_staff"),
            },
        ),
    )

    def save_model(self, request, obj, form, change):
        # This project has one kind of admin. Django splits it into two fields:
        # is_staff (may log in to the Django admin) and is_superuser (may do
        # everything in it). The form shows is_staff as "admin"; both fields
        # always get the same value.
        obj.is_superuser = obj.is_staff
        super().save_model(request, obj, form, change)

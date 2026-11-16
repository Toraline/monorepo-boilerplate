from rest_framework import permissions


class IsAdminOrReadOnly(permissions.BasePermission):
    """Every logged-in user may read. Only an admin (is_staff) may change."""

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        return request.method in permissions.SAFE_METHODS or user.is_staff

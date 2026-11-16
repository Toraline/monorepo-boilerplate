"""The addresses of the server: the Django admin, and the requests of each app under /api/.

/admin/ holds the pages of the Django admin. /api/admin/ holds the requests
that only an admin may call; the internal app uses them.
"""

from django.contrib import admin
from django.urls import include, path

from apps.accounts import urls as accounts_urls
from apps.todos import urls as todos_urls

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("apps.core.urls")),
    path("api/auth/", include("apps.accounts.urls")),
    path("api/", include("apps.todos.urls")),
    path("api/admin/", include(accounts_urls.admin_urlpatterns)),
    path("api/admin/", include(todos_urls.admin_urlpatterns)),
]

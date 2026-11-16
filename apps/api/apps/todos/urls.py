from django.urls import path

from . import views

urlpatterns = [
    path("todos/", views.todos, name="todos"),
    path("todos/<int:todo_id>/", views.todo, name="todo"),
    path("todos/<int:todo_id>/complete/", views.complete, name="todo-complete"),
    path("todos/<int:todo_id>/reopen/", views.reopen, name="todo-reopen"),
    path("tags/", views.tags, name="tags"),
    path("tags/<int:tag_id>/", views.tag, name="tag"),
]

# The requests for admins only. config/urls.py puts them under /api/admin/.
admin_urlpatterns = [
    path("todos/", views.all_todos, name="admin-todos"),
    path("history/", views.history, name="admin-history"),
]

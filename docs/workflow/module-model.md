# The model for a new module

The module to copy the structure from when you build a new one: the todo product of this repository. The skill `/new-module` reads this file.

## Context you need before reading

- **Module**: one part of the product with its own data, its own requests and its own screens. Example: the todos.
- **Model module**: an existing module whose files and conventions a new module copies. The new module copies the structure, not the product behavior.
- **Server**: the program in `apps/api` (Django). A module of the server is one Django app, a folder under `apps/api/apps/`.
- **Feature folder**: a folder under `src/features/` of a web app. It holds the requests, the hooks and the components of one part of the product.
- **Messages files**: `src/i18n/messages/en.json` and `pt-BR.json` of a web app. Every text that a person reads is there.

## The model: the todo product

The todo product has 3 parts. Each new module copies the parts it needs.

| Part | Where | Copy it when |
|---|---|---|
| The server module | `apps/api/apps/todos/` | The module stores data or answers requests |
| The screens of a user | `apps/web/src/features/todos/` and `apps/web/src/features/tags/` | A user sees or changes the data in the web app |
| The screens of an admin | `apps/internal/src/features/tags/`, `todos/` and `history/` | An admin sees or changes the data in the internal app |

## The files of the model, and what a new module does with each

### The server (`apps/api`)

Example names below are for a new module `notes`.

| File of the model | What it holds | The new module |
|---|---|---|
| `apps/api/apps/todos/apps.py` | The name of the Django app | `apps/api/apps/notes/apps.py`, with the name `apps.notes` |
| `models.py` | The tables | Its own tables |
| `selectors.py` | Code that reads data | One function for each read |
| `services.py` | Code that changes data | One function for each change |
| `serializers.py` | What a request accepts and what an answer contains. Names in an answer are in camelCase (`createdAt`) | The same split: one serializer for the answer, one for what a request accepts |
| `views.py` | One function per address. It calls serializers, services and selectors. A list uses `paged_response` of `apps/core/pagination.py` | The same |
| `urls.py` | The addresses. `admin_urlpatterns` holds the addresses for admins only | The same |
| `admin.py` | What the Django admin shows | Only when a person must see the rows there |
| `migrations/` | Written by `manage.py makemigrations` | Run `apps/api/.venv/bin/python manage.py makemigrations notes` inside `apps/api`, and commit the file |
| `tests/test_todos_api.py` | The tests of the requests: a user gets only their own rows, a wrong body is refused | One test file per group of requests |

Where the server module is registered, outside its folder:

1. `apps/api/config/settings.py`: one line in `INSTALLED_APPS`, for example `"apps.notes",`.
2. `apps/api/config/urls.py`: one line per list of addresses, for example `path("api/", include("apps.notes.urls")),`.
3. `apps/api/README.md`: the table under "Requests" gets one row for each request, written as `` `GET /api/notes/` ``, and the section "Folders" names the new folder. A test fails when a request is missing in the table (`apps/api/apps/core/tests/test_requests.py`). The same test file checks that every request needs a login, and that every request under `/api/admin/` refuses a user who is not an admin.

### A web app (`apps/web` or `apps/internal`)

| File of the model | What it holds | The new module |
|---|---|---|
| `src/features/todos/api/todos.ts` | The functions that send the requests, through `apiFetch` of `@repo/shared/api`, and the Zod schemas that check the answers | `src/features/notes/api/notes.ts` |
| `src/features/todos/api/todo-form.ts` | The rules of a form, and its test next to it | Only when the module has a form with rules |
| `src/features/todos/hooks/use-todos.ts` | The TanStack Query hooks: one key for the lists, one hook per request, a reload of the lists after a change | `src/features/notes/hooks/use-notes.ts` |
| `src/features/todos/components/todo-list.tsx` | The screen: the states loading, failed and empty with `StateMessage` of `@repo/ui/components`, then the list | `src/features/notes/components/` |
| `src/features/todos/components/todo-list.test.tsx` | The tests of the screen, with `mockServer` of `@repo/shared/testing` and `renderWithProviders` of `src/test/render.tsx` | A test next to each screen |
| `src/features/todos/index.ts` | What the rest of the app may import from the feature | `src/features/notes/index.ts` |
| `src/app/(app)/page.tsx` in `apps/web`, `src/app/(admin)/tags/page.tsx` in `apps/internal` | The page: it only renders the screen of the feature | A folder with a `page.tsx` under `src/app/(app)/` (needs a login) or `src/app/(admin)/` (admins only) |

Where the feature is registered, outside its folder:

1. `src/i18n/messages/en.json` and `src/i18n/messages/pt-BR.json`: one group with the texts of the module, the same keys in both files. `make lint` refuses a text written in a component, and a test fails when the keys of the 2 files differ. The steps: [docs/languages.md](../languages.md).
2. In `apps/internal` only: the list `AREAS` in `src/features/auth/components/admin-menu.tsx` gets one entry, and the group `menu` of the messages files gets its text.
3. The `README.md` of the app: the line about `src/features/` names the new folder.

A component that both web apps need goes into `packages/ui`, with a test next to it and a story file in `apps/ui-catalog/stories/project/`. Code that both web apps need and that is not user interface goes into `packages/shared`.

### The checks

1. `make check` must pass after each sub-ticket. The database must be running: `make db-up`.
2. After a change of a page of `apps/web`, of a request of the server or of the login, run `make e2e` too. A new screen of `apps/web` that a user needs every day gets an end-to-end test; the steps are in [e2e/README.md](../../e2e/README.md).

## How this was checked

On 2026-11-15 the skill `/new-module` was followed once in a throwaway copy of the repository, for a small module `notes`: a table, 2 requests (`GET /api/notes/`, `POST /api/notes/`), and one screen in `apps/web` with a form and a list. The steps that need Linear (the approved model in a ticket, the sub-tickets) were not run.

| What | Result |
|---|---|
| The first run of the tests of the server | Failed: the request `GET /api/notes/` was not in the table of `apps/api/README.md`. That is registration 3 of the server above |
| `make check` after the 2 rows were added to the table | Passed: 173 tests of the server (170 before), 74 of `apps/web` (71 before), 98 of `apps/internal`, 103 of `packages/shared`, 58 of `packages/ui` |

The copy was deleted. Nothing of it is in the repository.

## Status

- **Done:** the todo product is named as the model, with its files and its registrations.
- **Not done:** nothing.
- **What you must do:** when the sample product is removed from a project (see [start-a-new-monorepo.md](../start-a-new-monorepo.md)), write the first own module of the project into this file as the new model.

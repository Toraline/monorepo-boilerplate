# apps

One folder per app. An app is a program that a person runs or opens: a server or a site.

| Folder | What it is | Language | State |
|---|---|---|---|
| `apps/api` | The server: Django, Django REST Framework, PostgreSQL. See [apps/api/README.md](api/README.md) | Python | Exists |
| `apps/web` | The public web app: Next.js, on `http://localhost:3000`. See [apps/web/README.md](web/README.md) | TypeScript | Exists: the login and the todo list of a user, with tags and filters |
| `apps/internal` | The internal app, for admins only: Next.js, on `http://localhost:3001`. See [apps/internal/README.md](internal/README.md) | TypeScript | Exists: the login for admins only, the tags, the todos of all users, the history |
| `apps/ui-catalog` | The catalog of the user interface components: Storybook, on `http://localhost:6006`. See [apps/ui-catalog/README.md](ui-catalog/README.md) | TypeScript | Exists: the components of the library and of `packages/ui` in the theme of this project, light and dark |

Rules:

1. The three JavaScript apps are members of the npm workspace. The root `package.json` lists them by name.
2. `apps/api` is Python. It is not a member of the npm workspace. It has its own virtual environment in `apps/api/.venv`.
3. An app never imports code from another app. Code that two apps share goes into `packages/`.
4. Each app has the commands `install-`, `run-`, `lint-` and `test-` in the root `Makefile`. A new JavaScript app needs a `package.json` with the scripts `dev`, `lint` and `test`; the comment at the top of the section "Apps" in the `Makefile` says how. The two Next.js apps and the catalog also have `build-`. The catalog has no `test` script: its check is its build.
5. The two Next.js apps have the same folders and the same versions of their packages. What both need and what is not user interface is in `packages/shared`. The theme and the components that only this project has are in `packages/ui`.

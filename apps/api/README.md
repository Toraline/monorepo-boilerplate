# apps/api: the server

The server of the sample product. It is a Django project that answers requests in JSON and keeps its data in PostgreSQL.

## Context you need before reading

- **Django**: the Python framework that the server is written in.
- **Django REST Framework**: the Django library that turns Python code into JSON requests.
- **Virtual environment**: a folder with the Python packages of one project. Here it is `apps/api/.venv`. Git ignores it.
- **Migration**: a file that changes the tables of the database. `make migrate` applies the ones that were not applied yet.
- **`.env`**: the file in the root folder of the repository with the values of your machine. Git ignores it. `.env.example` lists every variable with an invented sample value.
- **Django admin**: the pages that Django makes for managing the rows of the tables. Here they are on `http://localhost:8000/admin/`.
- **Admin**: a user who may log in to the Django admin and, later, use the internal app. In the table of the users it is the field `is_staff`.
- **Seed**: a command that puts first rows into an empty database. `make seed` creates the first admin. `make seed-sample` is optional: it creates invented sample users, tags and todos.
- **Todo**: one thing that a user wants to do. It has a title, an optional description, and it is completed or not completed. It belongs to one user, its owner.
- **Tag**: a label with a name and a color, for example "Work" in blue. A todo can have several tags. All users share the same tags, and only an admin creates and changes them.
- **History entry**: the record of one change of a todo: which todo, what happened (created, edited, completed, reopened or deleted), when, and which user did it. The history is the list of these entries.
- **Page**: one part of a long list. A request that returns a list returns one page of it, 20 rows unless the caller asks for another size.
- **Local mode**: the server runs on a developer's machine. It is on when `DJANGO_DEBUG=True` is in `.env`.
- **Cookie**: a small value that the server asks the browser to keep and to send back with each later request.
- **Session**: the record, in the database, that one browser is logged in as one user. The cookie `sessionid` holds its key.
- **Origin**: the scheme, host name and port of an address, for example `http://localhost:3000`. Two addresses with different ports are two origins.
- **Site**: the scheme and the domain of an address, without the port. `http://localhost:3000` and `http://localhost:8000` are the same site. `http://localhost:8000` and `http://127.0.0.1:8000` are two sites.
- **CSRF** (cross-site request forgery): an attack in which a page of another site makes the browser of a logged-in user send a request that changes data. The server stops it by asking for a secret value, the CSRF token, in each such request.
- **CORS** (cross-origin resource sharing): the rule of the browser that a page may read the answer of another origin only when that origin allows it.

## Versions

| What | Version | Where it is written |
|---|---|---|
| Python | 3.13 | `.python-version` in the root folder |
| Django | 5.2 (a long-term support version) | `apps/api/requirements.txt` |
| Django REST Framework | 3.18 | `apps/api/requirements.txt` |
| PostgreSQL | 17 | `docker-compose.yml` in the root folder |

## Folders

```
apps/api/
├── manage.py              Django's command-line program
├── requirements.txt       the packages the server needs to run, with exact versions
├── requirements-dev.txt   requirements.txt plus the packages for development (ruff)
├── pyproject.toml         the settings of ruff, the code style checker
├── config/                the project: settings, addresses, entry points
│   ├── settings.py        every setting; reads the values of the machine from .env
│   ├── env.py             the helpers that read one value from the environment
│   ├── urls.py            the addresses of the server; each app adds its own under /api/
│   ├── wsgi.py, asgi.py   the entry points for a production web server
└── apps/                  one folder per Django app
    ├── core/              what every app shares: the health request, the database check, the pages of a list, the rule "only an admin changes"
    ├── accounts/          the users: the table, login, logout, "who am I", the list of the users for an admin, the pages in the Django admin, the seed
    └── todos/             the todos, the tags and the history: the tables, the requests of a user for their own todos, the requests for the tags, the history entry of each change, the requests of an admin for the todos of all users and the history, the pages in the Django admin, the seed of the sample data
```

Each Django app splits its code into the same files:

| File | Content |
|---|---|
| `models.py` | The tables |
| `serializers.py` | What a request accepts and what an answer contains |
| `services.py` | Code that changes data |
| `selectors.py` | Code that reads data |
| `views.py` | One function or class per request. It calls serializers, services and selectors |
| `urls.py` | The addresses of the app. The list `admin_urlpatterns` holds the addresses for admins only; `config/urls.py` puts them under `/api/admin/` |
| `admin.py` | What the Django admin shows |
| `management/commands/` | Commands for `manage.py` |
| `tests/` | The tests |
| `migrations/` | The migrations. Django writes them |

An app has only the files it needs.

## Commands

Run every command from the root folder of the repository.

| Command | What it does |
|---|---|
| `make install-api` | Creates `apps/api/.venv` with Python 3.13 and installs the packages of `requirements-dev.txt` |
| `make migrate` | Applies the migrations to the database of this checkout |
| `make seed` | Runs `make migrate`, then creates the first admin from the `SEED_ADMIN_*` variables. It changes nothing when that user already exists |
| `make seed-sample` | Optional. Runs `make migrate`, then creates 2 invented sample users, 3 tags and 9 todos with their history entries. It skips what already exists. It runs only in local mode. See "Sample data" |
| `make run-api` | Starts the server on `http://localhost:8000`. `make api` is the same command. Ctrl+C stops it |
| `make lint-api` | Checks the code style with ruff |
| `make format-api` | Rewrites the files in the code style that `make lint-api` checks |
| `make test-api` | Runs the tests against PostgreSQL |

Every command except `make install-api` installs the packages first when `apps/api/.venv` is missing or older than a requirements file.

`make migrate`, `make seed`, `make seed-sample`, `make run-api` and `make test-api` need the database. When it is not running they print one line and stop:

```
The database does not answer on 127.0.0.1:5432. Fix: start it with 'make db-up', then run the command again.
```

To use another port for the server:

```bash
make run-api API_PORT=8001
```

To run another `manage.py` command, for example to create a migration after you changed a model:

```bash
cd apps/api && .venv/bin/python manage.py makemigrations
```

To add or update a package: change its line in `requirements.txt` (or `requirements-dev.txt`), with an exact version, and run `make install-api`.

## Settings

`config/settings.py` reads these variables from `.env` in the root folder. A variable that the environment of the process already has wins over the same line of `.env`, so a real server sets them in its own environment and has no `.env` file.

| Variable | Sample value in `.env.example` | Meaning | When it is missing |
|---|---|---|---|
| `DJANGO_SECRET_KEY` | An invented sample | The key that Django signs cookies with. Outside local mode: 50 characters or more, 5 different characters or more, and not the sample | The server does not start and names the variable |
| `DJANGO_DEBUG` | `True` | `True` turns local mode on | Local mode is off |
| `DJANGO_ALLOWED_HOSTS` | `localhost,127.0.0.1` | The host names that the server answers to | `localhost,127.0.0.1` |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST`, `POSTGRES_PORT` | The values of the database in Docker | Where the database is | The server does not start and names the variable |
| `WEB_ORIGINS` | `http://localhost:3000,http://localhost:3001` | The origins of the web apps that may call the server from a browser, separated by commas. Used for CORS and for CSRF | No web app may call the server from a browser |
| `COOKIE_SECURE` | Not set | `True`: the browser sends the cookies only over https | `False` in local mode, `True` otherwise |
| `COOKIE_SAMESITE` | Not set | `Lax`, `Strict` or `None`. See "Login and cookies" | `Lax` |
| `SESSION_COOKIE_AGE` | Not set | How long a login lasts, in seconds | `1209600` (14 days) |
| `LOGIN_THROTTLE_RATE` | Not set | The limit on login attempts from one network address: a number, a slash, and one of `second`, `minute`, `hour`, `day`. See "The limit on login attempts" | `10/minute` |
| `NUM_PROXIES` | Not set | How many proxies or load balancers are in front of the server. The limit on login attempts needs it to find the address of the person | `0` |
| `SECURE_SSL_REDIRECT` | Not set | `True`: a request over http is sent to the same address with https | `False` in local mode, `True` otherwise |
| `SECURE_HSTS_SECONDS` | Not set | For how many seconds a browser uses only https for the host (the header `Strict-Transport-Security`). `0` sends no header | `0` in local mode, `31536000` (1 year) otherwise |
| `SECURE_HSTS_INCLUDE_SUBDOMAINS` | Not set | `True`: the header also covers every subdomain of the host | `False` |
| `TRUST_PROXY_HTTPS_HEADER` | Not set | `True`: the server reads the header `X-Forwarded-Proto` of a proxy to know that the person used https. See "On a real server" | `False` |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_NAME` | `admin@example.com`, an invented sample password, `Sample Admin` | The first admin that `make seed` creates | `make seed` stops and names the variables. The server itself does not need them |
| `SEED_SAMPLE_PASSWORD` | An invented sample password | The password of the 2 sample users that `make seed-sample` creates | `make seed-sample` stops and names the variable. The server itself does not need it |

A sample value starts with `sample-`. When local mode is off, the server refuses to start with a `DJANGO_SECRET_KEY` that starts with `sample-` or that has fewer than 50 characters, and with a `POSTGRES_PASSWORD` that starts with `sample-` (`config/startup.py`). `make seed` refuses a `SEED_ADMIN_PASSWORD` that starts with `sample-`. `make seed-sample` does not run at all when local mode is off.

## Users and the Django admin

There is no sign-up. An admin creates each user in the Django admin, on `http://localhost:8000/admin/`.

`make seed` creates the first admin with the email and the password of `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in `.env`. It is safe to run again: when a user with that email exists, it prints `The user admin@example.com already exists. Nothing was changed.` It does not change the password of an existing user.

In the Django admin, under "Users":

| To do this | Do this |
|---|---|
| Create a user | Click "Add user". Fill the email, the name and the password twice. Click "Save" |
| Make a user an admin | Open the user. Tick "Admin". Click "Save" |
| Change the name or the email | Open the user. Change the field. Click "Save" |
| Change the password | Open the user. Click "Reset password" under the field "Password" |
| Turn a user off | Open the user. Untick "Active". Click "Save". The user cannot log in any more. The rows of the user stay |

Under "Todos", an admin sees the todos of all users. The pages are read-only: a todo cannot be added, changed or deleted there. A user who has todos cannot be deleted; turn the user off instead.

Under "Tags", an admin creates, renames, recolors and deletes the tags, with the same rules as the tag requests: no two tags with the same name, and a color in the form `#RRGGBB`.

Under "History entries", an admin sees every change of the todos of all users, newest first, with a filter by kind and by user. The pages are read-only: an entry cannot be added, changed or deleted. Because the todos are read-only in the Django admin, no change of a todo can happen there, so every change of a todo has its entry.

This project has one kind of admin. The box "Admin" sets two fields of Django to the same value: `is_staff` (may log in to the Django admin) and `is_superuser` (may do everything in it). There are no groups and no single permissions.

An email is stored in lower case. `Ana@Example.com` and `ana@example.com` are the same user.

## Sample data

`make seed-sample` puts invented rows into the database of your machine, so the requests and the web apps have something to show. It is optional. `make setup` does not run it.

```bash
make seed-sample
```

It creates:

| What | Rows |
|---|---|
| 2 users, not admins | `ana.lima@example.com` (Ana Lima) and `bruno.reis@example.com` (Bruno Reis). Their password is the value of `SEED_SAMPLE_PASSWORD` in `.env`; the sample in `.env.example` is `sample-user-password-for-local-use` |
| 3 tags | `Home`, `Work`, `Urgent` |
| 9 todos | 5 of Ana Lima and 4 of Bruno Reis. Some are completed, some have tags |
| 15 history entries | The entries that the changes above wrote: 9 `created`, 4 `completed`, 1 `reopened`, 1 `edited` |

Every name, email and text is invented.

It worked when the output has these 3 lines:

```
Users: 2 created, 0 already existed.
Tags: 3 created, 0 already existed.
Todos: 9 created, 0 already existed.
```

It is safe to run again. It skips a user whose email exists, a tag whose name exists, and a todo whose title the sample user already has, and it changes nothing of them, also not the password of a user. The second run prints `Users: 0 created, 2 already existed.` and the same for the tags and the todos.

It refuses to run when the server is not in local mode (`DJANGO_DEBUG` is not `True`). It prints `The sample data is for a local machine only, and the server is not in local mode (DJANGO_DEBUG is not True). Nothing was created.`

The code is in `apps/todos/management/commands/seed_sample.py`. It creates the todos through `apps/todos/services.py`, as the requests do.

## Login and cookies

A user logs in with an email and a password. The server then keeps a session and gives the browser the key of the session in a cookie. There is no sign-up and no "forgot my password": an admin creates the users.

What a web app does:

1. It sends `GET /api/auth/csrf/`. The answer has the CSRF token, and the browser gets the cookie `csrftoken`.
2. It sends `POST /api/auth/login/` with the email and the password in the body and the CSRF token in the header `X-CSRFToken`.
3. The server answers with the user and sets the cookie `sessionid`.
4. The browser sends `sessionid` with each later request. With `fetch`, the web app must pass the option `credentials: "include"` in every request, also in steps 1 and 2.
5. Each request that changes data (`POST`, `PUT`, `PATCH`, `DELETE`) needs the header `X-CSRFToken`. A login changes the token: after step 3, the web app does step 1 again to get the new one.

What the status of an answer means:

| Status | Meaning |
|---|---|
| `401` | Nobody is logged in, or the email or the password of a login is not correct |
| `403` | The CSRF token is missing or wrong, or the user is logged in and may not do this |
| `429` | Too many login attempts came from this network address. See "The limit on login attempts" |

Every request needs a login unless its view says otherwise (`DEFAULT_PERMISSION_CLASSES` in `config/settings.py`). A view for everybody has `@permission_classes([AllowAny])`. A view for admins only has `@permission_classes([IsAdminUser])`: an admin is a user with `is_staff` on. A view that every logged-in user may read and only an admin may change has `@permission_classes([IsAdminOrReadOnly])` (`apps/core/permissions.py`).

The two cookies:

| Cookie | Content | Can JavaScript read it | Lasts |
|---|---|---|---|
| `sessionid` | The key of the session. It is the login | No (`HttpOnly`) | 14 days (`SESSION_COOKIE_AGE`) |
| `csrftoken` | The secret that the CSRF token is made from | Yes | 1 year |

### The limit on login attempts

The server counts the login attempts of each network address (IP). The 11th attempt in one minute gets the status `429` and the header `Retry-After` with the seconds to wait. A right password is refused too while the address is above the limit.

| What | Value |
|---|---|
| What is counted | Each `POST /api/auth/login/` and each sent form of the login page of the Django admin, `/admin/login/`. Both share one count |
| The limit | `10/minute`. Another limit: the variable `LOGIN_THROTTLE_RATE`, for example `5/minute` or `100/hour` |
| The code | `LoginRateThrottle` and `admin_login` in `apps/core/throttling.py` |
| The tests | `apps/core/tests/test_throttling.py`. The other tests run with a limit that they never reach (`config/test_runner.py`), and `make e2e` sets `1000/minute` for its own server |

Three limits of this limit:

1. The count is per network address. An attacker who uses many addresses gets 10 attempts per minute from each. There is no count per email, because that would let anyone lock a user out by sending wrong passwords for that email.
2. The counts are kept in the memory of the server process (the default cache of Django). A real server that runs more than one process has one count per process. To share the count, set `CACHES` in `config/settings.py` to a cache that all processes use, for example Redis.
3. Behind a proxy or a load balancer, every request reaches the server from the address of the proxy. Set `NUM_PROXIES` to the number of proxies in front of the server (most often `1`), so the server takes the address of the person from the header `X-Forwarded-For`. With the default `0`, the server ignores that header, because any caller can write it.

### On a local machine

`.env` has `DJANGO_DEBUG=True` and `WEB_ORIGINS=http://localhost:3000,http://localhost:3001`.

- The cookies are not `Secure`, so they work over `http`.
- The cookies have `SameSite=Lax`. The web apps (`http://localhost:3000`, `http://localhost:3001`) and the server (`http://localhost:8000`) are the same site, so the browser sends the cookies.
- The web apps and the server are different origins, because the ports differ. `WEB_ORIGINS` is what lets the pages of the web apps read the answers of the server (CORS) and send requests that change data (CSRF).
- Use the host name `localhost` in all the addresses: the address you open in the browser, the address of the server that the web app calls, and `WEB_ORIGINS`. To the browser, `127.0.0.1` is another site than `localhost`: a page opened on `http://127.0.0.1:3000` that calls `http://localhost:8000` does not send the cookies.
- A browser keeps one set of cookies for `localhost`, for every port. Another Django project that runs on `localhost` uses the same cookie names, so a login in one project ends the login in the other.

### On a real server (not built yet)

Version 1 of this project runs only on a local machine. The settings are already written for a real server:

- Without `DJANGO_DEBUG=True`, the cookies are `Secure`: the browser sends them only over `https`. The server and the web apps must use `https`.
- `WEB_ORIGINS` holds the `https` origins of the web apps, for example `https://app.example.com,https://internal.example.com`.
- When the web apps and the server are subdomains of one domain (for example `app.example.com` and `api.example.com`), they are the same site and `SameSite=Lax` works. This is the layout to prefer.
- When they are on different domains, set `COOKIE_SAMESITE=None`. The server refuses `None` without `Secure`. Some browsers block such cookies.
- Without `DJANGO_DEBUG=True`, a request over `http` is answered with a redirect to `https` (`SECURE_SSL_REDIRECT`), and each answer over `https` has the header `Strict-Transport-Security` for 1 year (`SECURE_HSTS_SECONDS`). One address also answers over `http`: `/api/health/`, because a load balancer asks it from inside the network.
- When a proxy or a load balancer receives the `https` requests and passes them to Django over `http`, set `TRUST_PROXY_HTTPS_HEADER=True` and `NUM_PROXIES=1`. Django then reads the header `X-Forwarded-Proto` to know that the person used `https`. Do this only when the proxy always writes that header itself. Without it, Django answers every request with a redirect to `https`, and the browser reports too many redirects.
- Without `DJANGO_DEBUG=True`, the server does not start with a `DJANGO_SECRET_KEY` that is the sample or has fewer than 50 characters, or with the sample `POSTGRES_PASSWORD`. Make a key with: `python3 -c "import secrets; print(secrets.token_urlsafe(64))"`.
- `manage.py check --deploy` then prints 2 warnings, `security.W005` and `security.W021`. Both are choices: `SECURE_HSTS_INCLUDE_SUBDOMAINS=True` covers the subdomains too, and the preload list of the browsers is not used.

## Requests

Every request of the server so far. The server listens on `http://localhost:8000`. Bodies and answers are JSON. Every value in the examples is invented.

| Request | Needs a login | Needs the CSRF token | What it does |
|---|---|---|---|
| `GET /api/health/` | No | No | Says that the server answers, and whether the database answers |
| `GET /api/auth/csrf/` | No | No | Gives the CSRF token |
| `POST /api/auth/login/` | No | Yes | Logs a user in |
| `GET /api/auth/me/` | Yes | No | "Who am I": returns the user who is logged in |
| `POST /api/auth/logout/` | Yes | Yes | Ends the login |
| `GET /api/todos/` | Yes | No | Lists the todos of the user who is logged in, in pages |
| `POST /api/todos/` | Yes | Yes | Creates a todo for the user who is logged in |
| `GET /api/todos/<id>/` | Yes | No | Returns one todo of the user |
| `PATCH /api/todos/<id>/` | Yes | Yes | Edits one todo of the user |
| `DELETE /api/todos/<id>/` | Yes | Yes | Deletes one todo of the user |
| `POST /api/todos/<id>/complete/` | Yes | Yes | Marks one todo of the user as completed |
| `POST /api/todos/<id>/reopen/` | Yes | Yes | Marks one todo of the user as not completed |
| `GET /api/tags/` | Yes | No | Lists the tags, in pages |
| `POST /api/tags/` | Yes, as an admin | Yes | Creates a tag |
| `PATCH /api/tags/<id>/` | Yes, as an admin | Yes | Renames a tag, changes its color, or both |
| `DELETE /api/tags/<id>/` | Yes, as an admin | Yes | Deletes a tag |
| `GET /api/admin/todos/` | Yes, as an admin | No | Lists the todos of all users, in pages, each with its owner |
| `GET /api/admin/history/` | Yes, as an admin | No | Lists the history entries of all todos, in pages, newest first |
| `GET /api/admin/users/` | Yes, as an admin | No | Lists the users, in pages |

"Yes, as an admin": a user who is logged in and is not an admin gets status `403` and `{"detail": "You do not have permission to perform this action."}`. A request with no login gets status `401`.

The addresses under `/api/admin/` are the requests that the internal app uses. Every one of them answers only an admin, and none of them changes data. They are not the Django admin, whose pages are under `/admin/`.

In an address, `<id>` is the number of a row, for example `/api/todos/7/`.

The pages of the Django admin are on `/admin/`. They are pages for a person, not requests for a web app.

Answers that every request can give:

| Status | Body | When |
|---|---|---|
| `401` | `{"detail": "Authentication credentials were not provided."}` | The request needs a login and has none |
| `403` | `{"detail": "CSRF Failed: CSRF cookie not set."}`, or another text that starts with `CSRF Failed:` | The request needs the CSRF token, and the token is missing or wrong |
| `405` | `{"detail": "Method \"GET\" not allowed."}` | The address does not answer this method |
| `400` | `{"title": ["This field is required."]}` | A value of the body or a filter of the address is missing or wrong. Each key is the name of a field, and its value is the list of the problems of that field |
| `404` | `{"detail": "Not found."}` | The address has an `<id>`, and no row with that id exists or the user may not see it |

### Lists come in pages

Every request that returns a list returns one page of it, in this shape:

```json
{"count": 45, "page": 1, "pageSize": 20, "totalPages": 3, "results": []}
```

| Field | Meaning |
|---|---|
| `count` | How many rows the whole list has, after the filters |
| `page` | The number of this page. The first page is 1 |
| `pageSize` | How many rows a page holds |
| `totalPages` | How many pages the list has. An empty list has 1 page with no rows |
| `results` | The rows of this page |

Two values in the address choose the page:

| Value | Meaning | When it is missing |
|---|---|---|
| `page` | The number of the page | `1` |
| `pageSize` | How many rows a page holds, from 1 to 100. A larger number counts as 100. A value that is not a number from 1 up counts as 20 | `20` |

A page that does not exist, for example `?page=9` of a list with 3 pages, returns status `404` and `{"detail": "Invalid page."}`.

Each list has one fixed order. The todos are ordered by the date created, newest first. The tags are ordered by name, and upper and lower case count as the same letter. The history entries are ordered by date, newest first. The users are ordered by email.

The `curl` examples below keep the cookies in the file `cookies.txt` in the current folder: `-c cookies.txt` writes the cookies that the server sets, and `-b cookies.txt` sends them. Run the examples in the order of this document. Delete the file when you finish.

### `GET /api/health/`

Says that the server answers, and whether the database answers.

- Needs: nothing.
- Returns, when the database answers: status `200` and `{"status": "ok", "database": "ok"}`.
- Returns, when the database does not answer: status `503` and `{"status": "error", "database": "unavailable"}`.

```bash
curl -i http://localhost:8000/api/health/
```

### `GET /api/auth/csrf/`

Gives the CSRF token. A web app calls it before the login, and again after the login, because a login changes the token.

- Needs: nothing.
- Returns: status `200`, the token in the body, and the cookie `csrftoken`.

```bash
curl -c cookies.txt -b cookies.txt http://localhost:8000/api/auth/csrf/
```

```json
{"csrfToken": "Zx3SampleTokenSampleTokenSampleTokenSampleTokenSampleTokenSample"}
```

### `POST /api/auth/login/`

Logs a user in with an email and a password.

- Needs: the header `X-CSRFToken` with the token of `GET /api/auth/csrf/`, the cookie `csrftoken`, and a JSON body with `email` and `password`.
- Returns, when the email and the password are correct: status `200`, the user in the body, and the cookie `sessionid`.
- Returns, when the email is unknown, the password is wrong, or the user was turned off: status `401` and `{"detail": "The email or the password is not correct."}`. The answer is the same in the three cases.
- Returns, when `email` or `password` is missing: status `400` and, for example, `{"password": ["This field is required."]}`.
- Returns, above the limit on login attempts: status `429`, the header `Retry-After`, and `{"detail": "Request was throttled. Expected available in 42 seconds."}`. The web apps show "Too many login attempts. Try again later."

Replace `PASTE_THE_TOKEN_HERE` with the value of `csrfToken` that the request before returned. The email and the password are the sample values of the first admin in `.env.example`.

```bash
curl -c cookies.txt -b cookies.txt -H "Content-Type: application/json" -H "X-CSRFToken: PASTE_THE_TOKEN_HERE" -d '{"email": "admin@example.com", "password": "sample-admin-password-for-local-use"}' http://localhost:8000/api/auth/login/
```

```json
{"id": 1, "name": "Sample Admin", "email": "admin@example.com", "isAdmin": true}
```

| Field | Meaning |
|---|---|
| `id` | The number of the user in the database |
| `name` | The name of the user. It can be empty |
| `email` | The email of the user, in lower case |
| `isAdmin` | `true` when the user is an admin: the user may log in to the Django admin and, later, use the internal app |

### `GET /api/auth/me/`

"Who am I": returns the user who is logged in.

- Needs: the cookie `sessionid` of a login.
- Returns, with a login: status `200` and the user, with the same fields as the answer of the login.
- Returns, without a login: status `401`.

```bash
curl -b cookies.txt http://localhost:8000/api/auth/me/
```

```json
{"id": 1, "name": "Sample Admin", "email": "admin@example.com", "isAdmin": true}
```

### `POST /api/auth/logout/`

Ends the login. The cookie `sessionid` stops working.

- Needs: the cookie `sessionid` of a login, and the header `X-CSRFToken` with a token that was asked for after the login.
- Returns: status `204` and no body.
- Returns, without a login: status `401`.

First get the token again, because the login changed it:

```bash
curl -c cookies.txt -b cookies.txt http://localhost:8000/api/auth/csrf/
```

Then replace `PASTE_THE_TOKEN_HERE` with the new value of `csrfToken`:

```bash
curl -i -c cookies.txt -b cookies.txt -X POST -H "X-CSRFToken: PASTE_THE_TOKEN_HERE" http://localhost:8000/api/auth/logout/
```

After it, `GET /api/auth/me/` returns status `401`.

### The todos of a user

A user reads and changes only their own todos. This is also true for an admin: with these requests an admin gets the admin's own todos. The todo of another user answers with status `404` and `{"detail": "Not found."}`, the same answer as an id that does not exist.

A todo in an answer:

```json
{"id": 7, "title": "Buy milk", "description": "Two litres", "completed": false, "tags": [{"id": 2, "name": "Home", "color": "#2E7D32"}], "createdAt": "2026-11-15T17:40:00.123456Z", "updatedAt": "2026-11-15T17:40:00.123456Z"}
```

| Field | Meaning |
|---|---|
| `id` | The number of the todo in the database |
| `title` | The title. From 1 to 200 characters |
| `description` | The description. It can be empty. At most 2000 characters |
| `completed` | `true` when the todo is completed |
| `tags` | The tags of the todo, ordered by name. Each one has `id`, `name` and `color`. The list can be empty |
| `createdAt` | The date and time when the todo was created, in UTC |
| `updatedAt` | The date and time of the last change of the todo, in UTC. For a todo that never changed, it is a few microseconds after `createdAt` |

Each change of a todo writes one history entry:

| Kind of the entry | Written when |
|---|---|
| `created` | `POST /api/todos/` creates the todo |
| `edited` | `PATCH /api/todos/<id>/` changes the title, the description or the tags. One request writes one entry, also when it changes several fields |
| `completed` | `POST /api/todos/<id>/complete/` completes a todo that was not completed |
| `reopened` | `POST /api/todos/<id>/reopen/` reopens a todo that was completed |
| `deleted` | `DELETE /api/todos/<id>/` deletes the todo |

A request that changes nothing writes no entry: a `PATCH` whose values are the values that the todo already has, or `complete` on a completed todo. Completing and reopening do not write an `edited` entry. A request that is refused writes no entry.

An entry holds the id of the todo, its title right after the change, its owner, the kind, the date, and the user who made the change. The entries of a deleted todo stay, with its id, its title and its owner. No request changes or deletes an entry. The change and its entry are saved together: when one of them fails, neither is saved (`apps/todos/services.py`).

The examples below need a login: the file `cookies.txt` must hold the cookies of `POST /api/auth/login/`. For each request that needs the CSRF token, replace `PASTE_THE_TOKEN_HERE` with the value of `csrfToken` that `GET /api/auth/csrf/` returned after the login.

### `GET /api/todos/`

Lists the todos of the user who is logged in, in pages, newest first.

- Needs: a login.
- Accepts in the address: `page` and `pageSize` (see "Lists come in pages"), and two filters. `completed`: `true` returns only the completed todos, `false` only the todos that are not completed. `tag`: the id of one tag; only the todos that have this tag are returned. With both filters, a todo must match both.
- Returns: status `200` and one page of todos.
- Returns, when `completed` is not `true` or `false`: status `400` and `{"completed": ["Must be a valid boolean."]}`.
- Returns, when `tag` is not a whole number: status `400` and `{"tag": ["A valid integer is required."]}`. The id of a tag that does not exist returns an empty list.

```bash
curl -b cookies.txt "http://localhost:8000/api/todos/?completed=false&tag=2&page=1"
```

```json
{"count": 1, "page": 1, "pageSize": 20, "totalPages": 1, "results": [{"id": 7, "title": "Buy milk", "description": "Two litres", "completed": false, "tags": [{"id": 2, "name": "Home", "color": "#2E7D32"}], "createdAt": "2026-11-15T17:40:00.123456Z", "updatedAt": "2026-11-15T17:40:00.123456Z"}]}
```

### `POST /api/todos/`

Creates a todo. Its owner is the user who is logged in. It starts as not completed.

- Needs: a login, the header `X-CSRFToken`, and a JSON body with `title`. `description` is optional. `tagIds` is optional: the list of the ids of the tags of the todo, for example `[2, 5]`, with 50 ids at most. Without it the todo has no tags.
- Returns: status `201` and the todo.
- Returns, when an id of `tagIds` is not the id of a tag: status `400` and `{"tagIds": ["These tag ids do not exist: 999."]}`. Nothing is saved.
- Returns, when `title` is missing: status `400` and `{"title": ["This field is required."]}`.
- Returns, when `title` is empty or holds only spaces: status `400` and `{"title": ["This field may not be blank."]}`.
- Returns, when `title` has more than 200 characters: status `400` and `{"title": ["Ensure this field has no more than 200 characters."]}`.
- Returns, when the body has `completed`: status `400` and `{"completed": ["Use the requests complete and reopen to change this field."]}`.

Spaces around the title and the description are removed. The body cannot choose the owner.

```bash
curl -b cookies.txt -H "Content-Type: application/json" -H "X-CSRFToken: PASTE_THE_TOKEN_HERE" -d '{"title": "Buy milk", "description": "Two litres", "tagIds": [2]}' http://localhost:8000/api/todos/
```

### `GET /api/todos/<id>/`

Returns one todo of the user who is logged in.

- Needs: a login.
- Returns: status `200` and the todo.
- Returns, when the todo does not exist or belongs to another user: status `404`.

```bash
curl -b cookies.txt http://localhost:8000/api/todos/7/
```

### `PATCH /api/todos/<id>/`

Edits one todo of the user who is logged in. Only the fields that the body has are changed.

- Needs: a login, the header `X-CSRFToken`, and a JSON body with one or more of `title`, `description` and `tagIds`. `tagIds` replaces the tags of the todo: `[]` removes all of them. Without `tagIds` the tags stay.
- Returns: status `200` and the todo after the change.
- Returns, when a value is wrong: status `400`, with the same errors as `POST /api/todos/`. A body with `completed` is refused in the same way.
- Returns, when the todo does not exist or belongs to another user: status `404`.

The address does not answer `PUT`.

```bash
curl -b cookies.txt -X PATCH -H "Content-Type: application/json" -H "X-CSRFToken: PASTE_THE_TOKEN_HERE" -d '{"title": "Buy bread"}' http://localhost:8000/api/todos/7/
```

### `DELETE /api/todos/<id>/`

Deletes one todo of the user who is logged in.

- Needs: a login and the header `X-CSRFToken`.
- Returns: status `204` and no body.
- Returns, when the todo does not exist or belongs to another user: status `404`.

```bash
curl -i -b cookies.txt -X DELETE -H "X-CSRFToken: PASTE_THE_TOKEN_HERE" http://localhost:8000/api/todos/7/
```

### `POST /api/todos/<id>/complete/`

Marks one todo of the user who is logged in as completed.

- Needs: a login and the header `X-CSRFToken`. No body.
- Returns: status `200` and the todo, with `completed` set to `true`. A todo that was already completed gets the same answer, and nothing is changed.
- Returns, when the todo does not exist or belongs to another user: status `404`.

```bash
curl -b cookies.txt -X POST -H "X-CSRFToken: PASTE_THE_TOKEN_HERE" http://localhost:8000/api/todos/7/complete/
```

### `POST /api/todos/<id>/reopen/`

Marks one todo of the user who is logged in as not completed.

- Needs: a login and the header `X-CSRFToken`. No body.
- Returns: status `200` and the todo, with `completed` set to `false`. A todo that was not completed gets the same answer, and nothing is changed.
- Returns, when the todo does not exist or belongs to another user: status `404`.

```bash
curl -b cookies.txt -X POST -H "X-CSRFToken: PASTE_THE_TOKEN_HERE" http://localhost:8000/api/todos/7/reopen/
```

### The tags

All users share one list of tags. Every logged-in user reads it and puts its tags on their own todos (`tagIds` in `POST /api/todos/` and `PATCH /api/todos/<id>/`). Only an admin creates, renames, recolors and deletes a tag.

A tag in an answer:

```json
{"id": 2, "name": "Home", "color": "#2E7D32"}
```

| Field | Meaning |
|---|---|
| `id` | The number of the tag in the database |
| `name` | The name. From 1 to 50 characters. Two tags cannot have the same name; upper and lower case, and spaces around the name, are ignored in this comparison: `Work`, `WORK` and ` work ` are the same name |
| `color` | The color, in the form `#RRGGBB`: `#` and 6 hexadecimal digits. The server accepts `#2e7d32` and stores `#2E7D32` |
| `todoCount` | Only in `GET /api/tags/`, and only when the user is an admin: how many todos, of all users, have the tag |

### `GET /api/tags/`

Lists the tags, in pages, ordered by name.

- Needs: a login.
- Accepts in the address: `page` and `pageSize` (see "Lists come in pages"). To get up to 100 tags in one answer, for example to fill a choice on screen, send `pageSize=100`.
- Returns: status `200` and one page of tags. For an admin, each tag also has `todoCount`.

```bash
curl -b cookies.txt "http://localhost:8000/api/tags/?pageSize=100"
```

```json
{"count": 2, "page": 1, "pageSize": 100, "totalPages": 1, "results": [{"id": 2, "name": "Home", "color": "#2E7D32"}, {"id": 1, "name": "Work", "color": "#1565C0"}]}
```

### `POST /api/tags/`

Creates a tag.

- Needs: a login as an admin, the header `X-CSRFToken`, and a JSON body with `name` and `color`.
- Returns: status `201` and the tag, with `id`, `name` and `color`.
- Returns, when a tag with this name exists: status `400` and `{"name": ["A tag with this name already exists."]}`.
- Returns, when the color has another form than `#RRGGBB`: status `400` and `{"color": ["The color must have the form #RRGGBB, for example #1A2B3C."]}`.
- Returns, when `name` or `color` is missing: status `400` and, for example, `{"color": ["This field is required."]}`.
- Returns, when the user is not an admin: status `403`.

```bash
curl -b cookies.txt -H "Content-Type: application/json" -H "X-CSRFToken: PASTE_THE_TOKEN_HERE" -d '{"name": "Urgent", "color": "#C62828"}' http://localhost:8000/api/tags/
```

### `PATCH /api/tags/<id>/`

Renames a tag, changes its color, or both. Every todo that has the tag shows the new name and color.

- Needs: a login as an admin, the header `X-CSRFToken`, and a JSON body with `name`, `color` or both.
- Returns: status `200` and the tag after the change.
- Returns, when a value is wrong: status `400`, with the same errors as `POST /api/tags/`.
- Returns, when the user is not an admin: status `403`.
- Returns, when the tag does not exist: status `404`.

```bash
curl -b cookies.txt -X PATCH -H "Content-Type: application/json" -H "X-CSRFToken: PASTE_THE_TOKEN_HERE" -d '{"name": "Office"}' http://localhost:8000/api/tags/1/
```

### `DELETE /api/tags/<id>/`

Deletes a tag. The todos that had the tag stay, without it. Their `updatedAt` does not change, and no history entry is written for them.

- Needs: a login as an admin and the header `X-CSRFToken`.
- Returns: status `204` and no body.
- Returns, when the user is not an admin: status `403`.
- Returns, when the tag does not exist: status `404`.

```bash
curl -i -b cookies.txt -X DELETE -H "X-CSRFToken: PASTE_THE_TOKEN_HERE" http://localhost:8000/api/tags/1/
```

### The requests for an admin

The three requests below answer only an admin. They read and change nothing. A user in these answers has the short form:

```json
{"id": 4, "name": "Ana Lima", "email": "ana.lima@example.com"}
```

Log in as an admin before the examples, for example as the first admin of `make seed`.

### `GET /api/admin/todos/`

Lists the todos of all users, in pages, newest first.

- Needs: a login as an admin.
- Accepts in the address: `page` and `pageSize` (see "Lists come in pages"), and three filters. `owner`: the id of a user; only the todos of this user. `tag`: the id of a tag; only the todos that have this tag. `completed`: `true` or `false`. With several filters, a todo must match all of them.
- Returns: status `200` and one page of todos. Each todo has the fields of a todo of `GET /api/todos/`, and `owner`: the user who owns it, in the short form.
- Returns, when a filter has a wrong value: status `400` and, for example, `{"owner": ["A valid integer is required."]}`. An id that matches no user or no tag returns an empty list.
- Returns, when the user is not an admin: status `403`.

```bash
curl -b cookies.txt "http://localhost:8000/api/admin/todos/?owner=4&completed=false"
```

```json
{"count": 1, "page": 1, "pageSize": 20, "totalPages": 1, "results": [{"id": 7, "title": "Buy milk", "description": "Two litres", "completed": false, "tags": [{"id": 2, "name": "Home", "color": "#2E7D32"}], "createdAt": "2026-11-15T17:40:00.123456Z", "updatedAt": "2026-11-15T17:40:00.123456Z", "owner": {"id": 4, "name": "Ana Lima", "email": "ana.lima@example.com"}}]}
```

### `GET /api/admin/history/`

Lists the history entries of the todos of all users, in pages, newest first.

- Needs: a login as an admin.
- Accepts in the address: `page` and `pageSize`, and three filters. `todo`: the id of a todo, also of a deleted todo. `user`: the id of the user who made the change. `kind`: `created`, `edited`, `completed`, `reopened` or `deleted`. With several filters, an entry must match all of them.
- Returns: status `200` and one page of entries.
- Returns, when `kind` is another word: status `400` and `{"kind": ["\"archived\" is not a valid choice."]}`.
- Returns, when the user is not an admin: status `403`.

The address answers only `GET`: no request adds, changes or deletes an entry.

```bash
curl -b cookies.txt "http://localhost:8000/api/admin/history/?todo=7"
```

```json
{"count": 2, "page": 1, "pageSize": 20, "totalPages": 1, "results": [{"id": 31, "kind": "deleted", "createdAt": "2026-11-15T18:05:00.123456Z", "todoId": 7, "todoTitle": "Buy milk", "todoOwner": {"id": 4, "name": "Ana Lima", "email": "ana.lima@example.com"}, "user": {"id": 4, "name": "Ana Lima", "email": "ana.lima@example.com"}}, {"id": 12, "kind": "created", "createdAt": "2026-11-15T17:40:00.123456Z", "todoId": 7, "todoTitle": "Buy milk", "todoOwner": {"id": 4, "name": "Ana Lima", "email": "ana.lima@example.com"}, "user": {"id": 4, "name": "Ana Lima", "email": "ana.lima@example.com"}}]}
```

| Field | Meaning |
|---|---|
| `id` | The number of the entry in the database |
| `kind` | What happened: `created`, `edited`, `completed`, `reopened` or `deleted` |
| `createdAt` | The date and time of the change, in UTC |
| `todoId` | The id of the todo. It stays the same after the todo is deleted |
| `todoTitle` | The title of the todo right after the change. For `deleted`: the title that the todo had |
| `todoOwner` | The user who owns, or owned, the todo, in the short form |
| `user` | The user who made the change, in the short form |

### `GET /api/admin/users/`

Lists the users, in pages, ordered by email. The internal app fills its owner filter with it. The list includes the admins and the users who were turned off.

- Needs: a login as an admin.
- Accepts in the address: `page` and `pageSize`. To get up to 100 users in one answer, send `pageSize=100`.
- Returns: status `200` and one page of users, each in the short form.
- Returns, when the user is not an admin: status `403`.

```bash
curl -b cookies.txt "http://localhost:8000/api/admin/users/?pageSize=100"
```

```json
{"count": 2, "page": 1, "pageSize": 100, "totalPages": 1, "results": [{"id": 1, "name": "Sample Admin", "email": "admin@example.com"}, {"id": 4, "name": "Ana Lima", "email": "ana.lima@example.com"}]}
```

### How this list is kept up to date

This list is written by hand. When you add or change a request, change this section in the same commit. The test `apps/core/tests/test_requests.py` fails when an address under `/api/` is not written in this file in the form `` `METHOD /address/` ``. The part of an address that holds the number of a row is written `<id>`. The same test fails when a new request needs no login and is not in the list `PUBLIC` of that test, and when an address under `/api/admin/` answers a user who is not an admin with another status than `403`.

## Status

- **Done:** the Django project, the settings read from `.env`, the table of the users, the health request, login, logout, "who am I", the CSRF token, the Django admin for the users, the seed of the first admin, the commands, the tests of all of them, and the list of the requests in this file; the todos of a user (list in pages, create, read, edit, complete, reopen, delete) and their read-only pages in the Django admin; the tags (list, create, rename, recolor, delete), the tags of a todo and the filter of the todo list by tag; the history entry of each change of a todo; the requests for an admin (the todos of all users with filters, the history with filters, the users); the optional seed of the sample data (`make seed-sample`).
- **Not done:** nothing that is planned for version 1 of the server. The screens that call these requests are in `apps/web` and `apps/internal`.
- **What you must do:** follow [docs/setup-guide.md](../../docs/setup-guide.md).

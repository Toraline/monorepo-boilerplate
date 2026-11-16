# apps/api: the server

The server of this project. It is a Django project that answers requests in JSON and keeps its data in PostgreSQL.

## Context you need before reading

- **Django**: the Python framework that the server is written in.
- **Django REST Framework**: the Django library that turns Python code into JSON requests.
- **Virtual environment**: a folder with the Python packages of one project. Here it is `apps/api/.venv`. Git ignores it.
- **Migration**: a file that changes the tables of the database. `make migrate` applies the ones that were not applied yet.
- **`.env`**: the file in the root folder of the repository with the values of your machine. Git ignores it. `.env.example` lists every variable with an invented sample value.
- **Django admin**: the pages that Django makes for managing the rows of the tables. Here they are on `http://localhost:8000/admin/`.
- **Admin**: a user who may log in to the Django admin and, later, use the internal app. In the table of the users it is the field `is_staff`.
- **Seed**: a command that puts first rows into an empty database. `make seed` creates the first admin.
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
    └── accounts/          the users: the table, login, logout, "who am I", the list of the users for an admin, the pages in the Django admin, the seed
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
| `make run-api` | Starts the server on `http://localhost:8000`. `make api` is the same command. Ctrl+C stops it |
| `make lint-api` | Checks the code style with ruff |
| `make format-api` | Rewrites the files in the code style that `make lint-api` checks |
| `make test-api` | Runs the tests against PostgreSQL |

Every command except `make install-api` installs the packages first when `apps/api/.venv` is missing or older than a requirements file.

`make migrate`, `make seed`, `make run-api` and `make test-api` need the database. When it is not running they print one line and stop:

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

A sample value starts with `sample-`. When local mode is off, the server refuses to start with a `DJANGO_SECRET_KEY` that starts with `sample-` or that has fewer than 50 characters, and with a `POSTGRES_PASSWORD` that starts with `sample-` (`config/startup.py`). `make seed` refuses a `SEED_ADMIN_PASSWORD` that starts with `sample-`.

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

This project has one kind of admin. The box "Admin" sets two fields of Django to the same value: `is_staff` (may log in to the Django admin) and `is_superuser` (may do everything in it). There are no groups and no single permissions.

An email is stored in lower case. `Ana@Example.com` and `ana@example.com` are the same user.

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
| `GET /api/admin/users/` | Yes, as an admin | No | Lists the users, in pages |

"Yes, as an admin": a user who is logged in and is not an admin gets status `403` and `{"detail": "You do not have permission to perform this action."}`. A request with no login gets status `401`.

The addresses under `/api/admin/` are the requests for the internal app. Every one of them answers only an admin, and none of them changes data. They are not the Django admin, whose pages are under `/admin/`.

In an address, `<id>` is the number of a row, for example `/api/notes/7/` in a request that you add. No request of today has one.

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

Each list has one fixed order. The users are ordered by email.

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

### The requests for an admin

The request below answers only an admin. It reads and changes nothing. A user in its answer has the short form:

```json
{"id": 4, "name": "Ana Lima", "email": "ana.lima@example.com"}
```

Log in as an admin before the example, for example as the first admin of `make seed`.

### `GET /api/admin/users/`

Lists the users, in pages, ordered by email. The internal app has the code that calls it (`apps/internal/src/features/users`); no page uses it yet. The list includes the admins and the users who were turned off.

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

- **Done:** the Django project, the settings read from `.env`, the table of the users, the health request, login, logout, "who am I", the CSRF token, the Django admin for the users, the seed of the first admin, the commands, the tests of all of them, and the list of the requests in this file; the request for an admin that lists the users.
- **Not done:** the tables and the requests of your own product. The skill `/new-module` adds a module.
- **What you must do:** follow [docs/setup-guide.md](../../docs/setup-guide.md).

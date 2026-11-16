# Setup guide

How to set up the boilerplate on a machine, and how to give another project the same way of working.

To start a new project of your own from this repository, follow [start-a-new-monorepo.md](start-a-new-monorepo.md) first. It sends you to this page for the details.

## Context you need before reading

- **Skill**: an instruction file (`SKILL.md`) that an AI agent runs when you call it by name, for example `/create-spec`.
- **Core**: the skills, rules and scripts that are the same in every project. They live in this repository.
- **Pack**: a group of skills. `core` is always on. `team` is for work with other people (reviews, pull request upkeep, releases).
- **Project profile**: the table in `AGENTS.md` with the values that differ between projects.
- **Worktree**: a second folder of the same repository on its own branch. Each ticket gets one.
- **Main checkout**: the folder you cloned. With `main_checkout` set to `protected`, nothing is committed there.
- **MCP server**: the connection that lets an agent read and write a tool such as Linear.
- **Placeholder**: a value such as `<ask>` or an empty `KEY=` that you replace with your own.
- **Docker**: the program that runs the database of this project in a container. A container is an isolated program with its own files. Docker Desktop is the app that installs Docker.
- **Docker Compose**: the part of Docker that reads `docker-compose.yml` and starts what the file describes. Docker Desktop includes it. The command is `docker compose`.
- **PostgreSQL**: the database program. Here it runs only in Docker, on your machine.
- **npm workspace**: the list of JavaScript apps and packages in the root `package.json`. One `npm install` at the root installs all of them.
- **nvm**: a program that installs Node versions and switches between them. It reads the version from `.nvmrc`.
- **Server**: the program in `apps/api` that the web apps send their requests to. It is written in Python with Django.
- **Web apps**: the two sites of the sample product, written with Next.js. `apps/web` is for the users, on `http://localhost:3000`. `apps/internal` is for the admins, on `http://localhost:3001`. `apps/web` has the login page and the todo list of the user. `apps/internal` has the login page for admins only and 3 areas: the tags, the todos of all users, the history of changes.
- **Virtual environment**: a folder with the Python packages of one project. Here it is `apps/api/.venv`.
- **Migration**: a file that creates or changes the tables of the database.
- **Admin**: a user who may log in to the Django admin, the pages on `http://localhost:8000/admin/` where users are created, edited and turned off.
- **Seed**: a command that puts first rows into an empty database. `make seed` creates the first admin. `make seed-sample` is optional: it creates invented sample users, tags and todos.
- **Todo**: one thing that a user wants to do. The sample product is a todo list.
- **Tag**: a label with a name and a color that users put on their todos.

## 1. What you need installed

| Tool | Version | Why | Check |
|---|---|---|---|
| git | 2.31 or newer (the worktree script uses an option that 2.31 added) | Everything | `git --version` |
| Docker Desktop | Any version that has `docker compose` version 2 | Runs the database (PostgreSQL 17) | `docker compose version` |
| Node | 24 (the file `.nvmrc`) | The web apps `apps/web` and `apps/internal` and the package `packages/shared`; it brings npm | `node --version` |
| nvm | Any | Installs the Node version of `.nvmrc` | `nvm --version` |
| Python | 3.13 (the file `.python-version`) | The server `apps/api` | `python3.13 --version` |
| make | Any (macOS and Linux have it) | Runs every command of the repository | `make --version` |
| GitHub CLI | Any | Opening pull requests | `gh auth status` |
| Claude Code or Cursor (or both) | - | Running the skills | - |
| A Linear workspace | - | Tickets and cycles | - |

Where to get them:

- Docker Desktop: https://docs.docker.com/get-started/get-docker/
- nvm: https://github.com/nvm-sh/nvm
- Python 3.13 on other systems than macOS: https://www.python.org/downloads/

Python 3.13 on macOS, with Homebrew:

```bash
brew install python@3.13
```

GitHub CLI on macOS, with Homebrew:

```bash
brew install gh
```

## 2. First time on a machine

Run every command from the root folder of the repository. Do the steps in this order.

**Step 1. Clone the repository into your repositories folder and enter it.**

```bash
git clone https://github.com/Toraline/monorepo-boilerplate.git
```

```bash
cd monorepo-boilerplate
```

It worked when: `ls` shows `Makefile`, `apps` and `packages`.

**Step 2. Open Docker Desktop and wait until it shows that the engine is running. Then check it.**

```bash
docker info
```

It worked when: the output has a `Server:` section with numbers, and no line that says `Cannot connect to the Docker daemon`.

**Step 3. Install and select the Node version of `.nvmrc`.**

```bash
nvm install
```

It worked when: the last line starts with `Now using node v24`.

**Step 4. Run the setup.**

```bash
make setup
```

It does 9 things, in this order: turns on the secret check, creates `local-docs/`, creates `.env` from `.env.example` (only when `.env` does not exist), runs `make doctor`, installs the npm workspace (the packages of the web apps), installs the server, starts the database, runs the migrations, creates the first admin.

The first time, `make doctor` prints `WARNING the dependencies of apps/web, apps/internal and packages/shared are not installed`, `WARNING the dependencies of apps/api are not installed` and `WARNING the database is not running`. The three are expected: the next things `make setup` does are the installs and the start of the database.

It worked when: the output has the line `PostgreSQL is ready on 127.0.0.1:5432.` (in a worktree the port is 5433 or higher), and the last 2 lines are:

```
Setup finished. The database is running. Stop it with: make db-down
Start the server and the web apps with: make run
```

If it stops at a line that starts with `FAIL`: the same line says how to fix it. Fix it and run `make setup` again. It is safe to run it more than once.

Steps 5, 6 and 7 are the three things that `make setup` did for the server. You run one of them again alone when the packages or the tables change, or after `make db-reset`.

**Step 5. Install the server.** `make setup` already did it. The command creates the folder `apps/api/.venv` and installs the Python packages of the server into it.

```bash
make install-api
```

It worked when: the last line is `apps/api: the dependencies are installed in apps/api/.venv.`

**Step 6. Run the migrations.** `make setup` already did it. The command creates the tables of the server in the database. The database must be running.

```bash
make migrate
```

It worked when: the output has lines that end with `OK`, or the last line is `No migrations to apply.`, and no line starts with `The database does not answer`.

**Step 7. Create the first admin.** `make setup` already did it. The command reads the email, the password and the name from the lines `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` and `SEED_ADMIN_NAME` of `.env`. The values that `.env.example` gives are invented samples: the email `admin@example.com` and the password `sample-admin-password-for-local-use`. They are for your own machine only.

```bash
make seed
```

It worked when: the last line is `The first admin was created: admin@example.com`. When the admin already exists, the last line is `The user admin@example.com already exists. Nothing was changed.` Both are correct.

**Step 8. Start the server and the web apps.**

```bash
make run
```

It starts 4 things: the database, the server (port 8000), `apps/web` (port 3000) and `apps/internal` (port 3001).

It worked when: the output has the line `Starting development server at http://127.0.0.1:8000/` and 2 lines that start with `- Local:`, one with `http://localhost:3000` and one with `http://localhost:3001`, and the command keeps running. Open a second terminal and ask the server whether it answers:

```bash
curl http://localhost:8000/api/health/
```

It worked when: the answer is `{"status":"ok","database":"ok"}`.

Then open `http://localhost:8000/admin/` in the browser. Type the email and the password of step 7 and click "Log in". It worked when: the page shows the title "Site administration" and the link "Users". Under "Users" you create, edit and turn off the users.

Then open `http://localhost:3000` in the browser. It worked when: the page shows the title "Log in" and the fields "Email" and "Password". Type the email and the password of step 7 and click "Log in". It worked when: the page shows the title "Your todos", the text "You have no todos yet." and, at the top right, "Logged in as Sample Admin" and the button "Log out". Click "New todo", type a title and click "Save". It worked when: the list shows the todo. To see a list with rows at once, run `make seed-sample` and log in as `ana.lima@example.com` with the password of the line `SEED_SAMPLE_PASSWORD` of `.env`.

Open `http://localhost:3001`. It worked when: the page shows the title "Log in". Log in with the email and the password of step 7. It worked when: the page shows the title "Todo list admin" and the menu "Tags", "Todos", "History". "Tags" is where an admin creates, renames, recolors and deletes the tags; "Todos" shows the todos of all users with 3 filters; "History" shows every change of a todo, newest first. A user who is not an admin, for example `ana.lima@example.com`, sees the page "You have no access" with the button "Log out". The two apps share the login on a local machine, because both are on `localhost`: a login in one app is also a login in the other.

Both pages are in the language of your browser when it is English or Portuguese, and in English otherwise; in Portuguese the title of the login page is "Entrar". The 2 buttons at the top right of the page, "English" and "Português (Brasil)", change the language. It worked when: after a click on "Português (Brasil)" the title is "Entrar", and it stays after you load the page again. More: [languages.md](languages.md).

The button "Theme: light", next to the 2 language buttons, changes between the light theme and the dark theme. The button "Log in" is violet: it is a `Button` of the component library in the theme of this project. It worked when: after a click on "Theme: light" the page is dark and the button says "Theme: dark", and it stays after you load the page again. More: [theme.md](theme.md).

Type `localhost` in these addresses, not `127.0.0.1`. To the browser the two names are different sites, and the cookies of the login do not travel from one to the other.

If the login page says "The server did not answer. Try again.", or a page says "The server did not say whether you are logged in.": the server is not running, or the line `NEXT_PUBLIC_API_BASE_URL` of `.env` does not hold the address of the server. The local value is `http://localhost:8000`. A `.env` that is older than the web apps has no such line; the apps then use `http://localhost:8000`.

Press Ctrl+C in the first terminal to stop the server and the web apps. To start one of them alone: `make run-api`, `make run-web` (or `make web`), `make run-internal` (or `make internal`).

**Step 9. Run the checks.** The database must be running.

```bash
make check
```

It runs 3 things, in this order: `make lint` (the code style of everything, and the types of the JavaScript code), `make test` (the tests of the server, of the 2 web apps, of `packages/shared` and of `packages/ui`), `make build` (the production build of the 2 web apps and the build of the catalog).

It worked when: the last line is `Check passed.` Before it, the tests of the server print `OK`, and the tests of each web app and of each package print a line that starts with `Tests` and ends with `passed`.

If the output has the line `The database does not answer on 127.0.0.1:5432. Fix: start it with 'make db-up', then run the command again.`: do what the line says.

**Step 10. When you stop working, stop the database.** The data stays.

```bash
make db-down
```

It worked when: the last line is `The database is stopped. Its data is kept.`

### Sample data (optional)

After step 7 you can fill the database with invented sample rows: 2 users, 3 tags and 9 todos with the history of their changes. It is optional, and `make setup` does not run it. The database must be running.

```bash
make seed-sample
```

It worked when: the output has the line `Todos: 9 created, 0 already existed.` It is safe to run again: the second run prints `Todos: 0 created, 9 already existed.`

The 2 sample users are `ana.lima@example.com` and `bruno.reis@example.com`. They are not admins. Their password is the value of the line `SEED_SAMPLE_PASSWORD` of `.env`; the sample that `.env.example` gives is `sample-user-password-for-local-use`.

If the output has the line `SEED_SAMPLE_PASSWORD is not set.`: your `.env` is older than this command. Copy the line that starts with `SEED_SAMPLE_PASSWORD=` from `.env.example` into `.env`, then run the command again.

The command refuses to run when `DJANGO_DEBUG` is not `True` in `.env`.

### The commands

`make help` prints every command with one line each. The ones you use most:

| Command | What it does |
|---|---|
| `make setup` | First time on this machine (step 4) |
| `make install-api` | Installs the Python packages of the server into `apps/api/.venv` |
| `make migrate` | Creates or changes the tables of the server in the database |
| `make seed` | Creates the first admin of the server. Safe to run again |
| `make seed-sample` | Optional. Creates invented sample users, tags and todos. Safe to run again. Only when `DJANGO_DEBUG` is `True` |
| `make doctor` | Checks the machine and the project. A line starts with `OK`, `WARNING` or `FAIL`; each `FAIL` prints its fix |
| `make install-js` | Installs the packages of the web apps and of `packages/shared` into `node_modules` in the root folder |
| `make run` | Starts the database and every app that exists. The server is on `http://localhost:8000`, `apps/web` on `http://localhost:3000`, `apps/internal` on `http://localhost:3001` |
| `make web`, `make internal` | Starts one web app alone. The same as `make run-web` and `make run-internal` |
| `make catalog` | Starts the catalog of the components (Storybook) on `http://localhost:6006`. The same as `make run-ui-catalog`. `make run` does not start it |
| `make lint` | Checks the code style of everything that exists, and the types of the JavaScript code |
| `make test` | Runs the tests of everything that exists |
| `make build` | Builds the 2 web apps the way a real server runs them, and the catalog of the components |
| `make check` | `make lint`, then `make test`, then `make build`. It must pass before a commit. The tests of the server need the database |
| `make e2e` | Runs the 2 end-to-end tests: a real browser opens `apps/web`, against the server and a database of their own. It starts what it needs and stops what it started. Not part of `make check`. See [e2e/README.md](../e2e/README.md) |
| `make db-up` | Starts the database and waits until it accepts connections |
| `make db-down` | Stops the database. The data stays |
| `make db-ps` | Shows the state of the database container |
| `make db-logs` | Shows the log of the database |
| `make db-reset CONFIRM=yes` | Deletes the data and starts an empty database |
| `make db-destroy CONFIRM=yes` | Stops the database and deletes its data |

One app or package alone: `make test-api`, `make lint-web`, `make run-internal`, `make test-shared`. The names after the dash are `api`, `web`, `internal`, `ui-catalog`, `shared` and `ui`. The server has one more command, `make format-api`: it rewrites the Python files in the code style that `make lint-api` checks. More about the server: [apps/api/README.md](../apps/api/README.md). More about the web apps: [apps/web/README.md](../apps/web/README.md) and [apps/internal/README.md](../apps/internal/README.md). More about the catalog: [apps/ui-catalog/README.md](../apps/ui-catalog/README.md).

### The database in a worktree

Each checkout has its own database: its own container, its own data, its own port. The main checkout uses the port in its own `.env` (5432 in `.env.example`). You start the worktree's database with `make db-up` inside the worktree.

`make worktree` and `make env` run `scripts/worktree-setup.local.sh` in a worktree. The script writes the worktree's port into the line `POSTGRES_PORT` of the worktree's `.env`. The rule:

1. The script counts up from 5433.
2. It skips the port of the main checkout, the port of every other worktree of this repository, and every port that a program on this machine listens on.
3. It writes the first port that is left, with a comment line above it: `# The port below was chosen for this worktree by scripts/worktree-setup.local.sh: <port>`.
4. A second run keeps a port that has this comment line, also while the worktree's own database is running on it.
5. A port with no such comment line is replaced. So a worktree never keeps the 5432 of `.env.example`, and never the port that it copied from the main checkout.

To choose the port of a worktree yourself: write it into the line `POSTGRES_PORT` and write the same port at the end of the comment line. Without the comment line, the next `make env` replaces your port.

The test `cli/shared/src/worktree-port.test.ts` (part of `make check`) runs the script in a temporary repository for these cases: main checkout on 5432, main checkout on another port, port in use by another program, a second run.

To check by hand, inside a worktree:

```bash
make env
grep -n "POSTGRES_PORT" .env
```

It worked when: the first command prints a line that starts with `Database port:`, and the second prints the comment line and `POSTGRES_PORT=<port>` with the same port, which is not the port of the main checkout.

Before you remove a worktree, delete its database. Run this inside the worktree:

```bash
make db-destroy CONFIRM=yes
```

`make worktree-remove` does not do it for you: without the command above, the container and its data stay in Docker.

### The automatic check on GitHub

Each pull request to `main` runs `make check`, then `make e2e`, on GitHub (the file `.github/workflows/check.yml`). When a step fails, the run keeps the report of the end-to-end tests for 7 days, under **Artifacts** on the page of the run. It installs the npm workspace and the server, and runs the tests of the server against a PostgreSQL 17 that GitHub starts for the run. The pull request page shows the result under the name `check`. It needs no key and no setting.

## 3. Connect Linear and GitHub

Neither needs a key in a file. Both sign in through the browser.

- **GitHub:** `gh auth login`.
- **Linear in Claude Code:** the server is declared in `.mcp.json`. Open the project in Claude Code and sign in when it asks.
- **Linear in Cursor:** the server is declared in `.cursor/mcp.json`. Open Cursor Settings, then MCP, then `linear`, and sign in.

## 4. Fill the project profile

Open `AGENTS.md`. Every value that says `<ask>` is yours to set. The fastest way is to type `/start` in Claude Code or Cursor: the first time, the skill asks each missing value, one at a time, and writes your answers into the table.

| Key | What to put |
|---|---|
| `packs` | `core`, or `core, team` when other people work on the project |
| `ticket_prefix` | Your Linear team key, for example `ABC` |
| `base_branch` | The branch that pull requests target |
| `worktree_path` | Leave the default unless you want worktrees elsewhere |
| `main_checkout` | `protected` or `open` |
| `spec_location` | `both` (Linear ticket and local file), `ticket` (only Linear) or `file` (only the local file) |
| `push` | `push` or `ask` |
| `allow_no_verify` | `no` |
| `commit_format` | Your commit message pattern |
| `check_command` | The command that must pass before a commit |
| `output_language` | The language agents write in for you |
| `external_writes` | What agents may write outside the repository without asking |
| `finished_status` | The Linear status a ticket gets when the agent's work on it is finished. Default: `Needs QA`. The name must exist in your Linear team |

## 5. Give another project the core

1. Run: `bash ~/code/repos/monorepo-boilerplate/scripts/sync-skills.sh /path/to/project`
2. If the script created `AGENTS.md`, fill its profile (step 4).
3. Add the line `-include agent/core.mk` to the project's `Makefile`. If the project already has its own `doctor` target, put `CORE_SKIP_DOCTOR := 1` above that line and add `doctor-core` as a prerequisite of the project's `doctor`. Remove the project's own `worktree`, `worktree-remove` and `worktree-list` targets: the core ones replace them.
4. Add the line `local-docs/` to the project's `.gitignore`.
5. If the script warned that `.claude/skills` or `.cursor/skills` is a real folder: move those skills into `agent/skills/`, give each one `pack: project` in its header, delete the old folder, and run the script again.
6. In the project, run `make setup`.

If the project needs its own step when a worktree is created (for example a value in the worktree's `.env`), put it in `scripts/worktree-setup.local.sh`. The core `worktree.sh` runs that file at the end of its setup, with `MAIN_CHECKOUT` set to the main checkout's path. The sync never touches that file.

Later, to get a newer core: `make sync-skills` inside the project. It replaces the core skills, rules and scripts. It never touches `AGENTS.md`, the `Makefile` or the project's own skills.

## 6. Rules about secrets and data

- `.env` and every `.env.*` file are ignored by git. Only `.env.example` is committed. Every value in it is an invented sample that works only on your own machine. A real key goes into `.env` only.
- A sample value starts with `sample-`. When `DJANGO_DEBUG` is not `True`, the server refuses a `DJANGO_SECRET_KEY` that starts with `sample-` or has fewer than 50 characters, and a `POSTGRES_PASSWORD` that starts with `sample-`. `make seed` refuses a `SEED_ADMIN_PASSWORD` that starts with `sample-`. `make seed-sample` does not run at all.
- The pre-commit hook `scripts/check-secrets.sh` refuses a commit that adds a token, a private key or a connection string with a password. It also refuses a line of the form `NAME=value` whose name holds `PASSWORD`, `SECRET`, `TOKEN`, `API_KEY` or `PRIVATE_KEY`, unless the value starts with `sample-` or is a placeholder. It refuses an env file in every folder, for example `apps/api/.env`. It reads binary files and renamed files too. It also refuses a private name: see "Private names" below.
- The hook runs only after `make hooks` (`make setup` runs it), and `git commit --no-verify` skips it. So the automatic check on GitHub runs the same script for everything that a pull request changes.
- The script knows the form of the tokens of some services (GitHub, npm, Stripe, AWS, Google, Slack, Notion, Linear, Figma, OpenAI). A secret in another form passes. Turn on secret scanning in the settings of the repository on GitHub as a second check.
- Examples and seed data in this repository are invented. Never copy real customer, financial or personal data into it.
- `local-docs/` is ignored by git. Private notes go there.

### Private names

A private name is a name that must never be in this repository: the name of a private repository, of a customer, of a product that is not public, or of a person. The pre-commit hook refuses a commit that adds one. The names are not written in a committed file, because that would publish them. You keep them in a file that git ignores.

1. Create the file `local-docs/private-names.txt` in the main checkout. `make setup` created the folder `local-docs/`. Worktrees read the same file.
2. Write one name per line. A line that starts with `#` is a comment. Example, with invented names:

   ```
   # Private repositories
   invented-private-shop
   # Customers
   Sample Customer Ltd
   ```

3. Upper and lower case count as the same letter. A name also matches inside a longer word, so do not write a common word.

When a commit adds a name of the file, to the text of a file or to its path, the commit stops with the line `Refused: <file> adds a private name, or has one in its path.` The hook does not print the name. Replace the name with a neutral phrase, for example "an earlier private project", and commit again.

Without the file the hook checks only the secrets. To search every committed file for the names, for example before you make a repository public:

```bash
git grep -n -i -F -f local-docs/private-names.txt
```

It worked when: the command prints nothing.

## 7. How the pieces fit

- **Skills** say what to do, step by step. They read the profile, so the same skill works in every project.
- **Rules** (`agent/rules/`) say how: how to write, what never to do with git, what needs a yes.
- **Scripts** do what must never go wrong: creating and removing worktrees, blocking git on the main checkout, refusing secrets.
- **The flow** is in `docs/workflow/working-pattern.md`.

## Status

- **Done:** the scripts, the rules, the templates, the profile, the skills; the folders `apps/` and `packages/`, the npm workspace, the database in Docker, the commands `setup`, `run`, `lint`, `test` and `check`, the automatic check on GitHub; the server `apps/api` with its settings, its health request, the table of the users, login, logout, "who am I", the Django admin and the seed of the first admin; the todo list in the server: todos, tags, the history of the changes, the requests for an admin, and the optional seed of sample data; the web app `apps/web` (login, the todo list of a user, tags, filters) and the internal app `apps/internal` (login for admins only, the tags, the todos of all users, the history), in English and Portuguese (Brazil) with a language switch, and the packages `packages/shared` and `packages/ui` with the code that both apps share; the catalog of the components `apps/ui-catalog`; the 2 end-to-end tests and `make e2e`; the guide [start-a-new-monorepo.md](start-a-new-monorepo.md).
- **Not done:** a deploy guide.
- **What you must do:** sections 2 to 4 above.

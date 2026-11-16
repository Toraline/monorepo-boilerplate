# monorepo-boilerplate: instructions for agents

The public starting point for Toraline monorepos. It is generic on purpose, and it never contains real keys or real data. It has two parts: the standard way of working with AI agents (skills, rules, scripts), and three apps: a server, a public web app and an internal app. The apps hold a small sample product, a todo list.

## Project profile

Skills and scripts read these values. They are the only place where this project's rules differ from another project's.

| Key | Value | Meaning |
|---|---|---|
| `packs` | `core, team` | Which skill packs are on |
| `ticket_prefix` | `TOR` | Linear team key, for example `TOR` |
| `base_branch` | `main` | Branch that worktrees start from and pull requests target |
| `worktree_path` | `../<repo>-<prefix>-<n>` | Where a ticket's worktree is created |
| `main_checkout` | `protected` | `protected`: no git changes on the main checkout. `open`: allowed |
| `spec_location` | `both` | The Linear ticket is the source of truth; a local file tracks the data and linked tickets |
| `push` | `push` | `push`: push after committing and report. `ask`: ask first |
| `allow_no_verify` | `no` | May a commit skip the checks that run before it |
| `commit_format` | `type(scope): summary (<PREFIX>-N)` | Commit message pattern |
| `check_command` | `make check` | What must pass before a commit |
| `output_language` | `English` | Language of what the agent writes for people |
| `external_writes` | `GitHub: push, open pull request` | Outside tools the agent may write to without asking |
| `finished_status` | `Needs QA` | Linear status a ticket gets when the agent's work on it is finished |

Extra values, used only when `packs` includes `team`:

| Key | Value | Meaning |
|---|---|---|
| `review_rules` | `<ask>` | Path of the file a code review checks against |
| `release_branches` | `<ask>` | Release branches, as `source -> target` pairs; the first pair is the default |
| `required_reviewers` | `<ask>` | Who must review, for example the path of a CODEOWNERS file |

A value of `<ask>` is not set yet. The `start` skill asks for it the first time it runs here.

## Before working

- Read the three rule files: [writing](agent/rules/writing.md), [git safety](agent/rules/git-safety.md), [ask first](agent/rules/ask-first.md).
- The flow, in order: [docs/workflow/working-pattern.md](docs/workflow/working-pattern.md).
- Where each kind of thing lives: [docs/workflow/sources-of-truth.md](docs/workflow/sources-of-truth.md).
- The module to copy the structure from when you build a new one (the todo product): [docs/workflow/module-model.md](docs/workflow/module-model.md).

## Skills

Skills are in [`agent/skills/`](agent/skills/). `.claude/skills` and `.cursor/skills` are links to that folder, so Claude Code and Cursor read the same files. The catalog is [docs/workflow/skills.md](docs/workflow/skills.md). When the person calls a skill (`/create-spec`, `/execute-spec`), read its `SKILL.md` and follow it. Not sure where to begin: `/start`.

Linear is reached through any tool or MCP server with `linear` in its name. Without access, ask the person for the ticket's content. Never invent it.

## Commands

```bash
make setup       # first time on this machine: hooks, local-docs, .env, doctor, install, database, migrations, first admin
make doctor      # check the machine and the project
make worktree TICKET=123 SLUG=short-slug
make migrate     # apply the database migrations of the server (apps/api)
make seed        # create the first admin of the server (SEED_ADMIN_* in .env); safe to run again
make seed-sample # optional: create 2 invented sample users with tags, todos and history; local mode only; safe to run again
make run         # start the database and every app that exists: the server (port 8000), apps/web (3000), apps/internal (3001)
make catalog     # start the catalog of the components (apps/ui-catalog, Storybook) on port 6006
make lint        # check the code style of everything that exists; for the JavaScript code also the types
make test        # run the tests of everything that exists
make build       # build apps/web and apps/internal for production, and the catalog (apps/ui-catalog)
make check       # what must pass before a commit: lint, then test, then build; the database must be running
make e2e         # the 2 end-to-end tests in a real browser (e2e/); not part of make check; GitHub runs both
make db-up       # start the database (PostgreSQL in Docker) of this checkout
make db-down     # stop the database; its data stays
make db-reset CONFIRM=yes    # delete the data and start an empty database
make db-destroy CONFIRM=yes  # stop the database and delete its data; run it before make worktree-remove
make help        # every command, one line each
make sync-skills # in other projects: copy the current core from this repository
```

One app or package alone: `make test-api`, `make lint-web`, `make run-internal`, `make test-shared` (the names are `api`, `web`, `internal`, `ui-catalog`, `shared`, `ui`). `make web`, `make internal` and `make catalog` are the same as `make run-web`, `make run-internal` and `make run-ui-catalog`. A target whose app does not exist yet prints "not created yet" and passes.

## Layout

- `apps/`: one folder per app. Exists: `apps/api`, the server (Django, Python); read [apps/api/README.md](apps/api/README.md) before changing it. Exists: `apps/web` (port 3000) and `apps/internal` (port 3001), the two Next.js apps; read [apps/web/README.md](apps/web/README.md) or [apps/internal/README.md](apps/internal/README.md) before changing one. Exists: `apps/ui-catalog` (port 6006), the Storybook that shows the components of the library and of `packages/ui` in the theme of this project; read [apps/ui-catalog/README.md](apps/ui-catalog/README.md) before changing it. A new component of `packages/ui` gets a story file in `apps/ui-catalog/stories/project/`. See [apps/README.md](apps/README.md).
- The two Next.js apps have the same folders (`src/app`, `src/features`, `src/components`, `src/lib`, `src/styles`, `src/test`) and the same package versions, all exact. A page sends a request to the server only through `apiFetch` of `@repo/shared/api`. Open the apps with `localhost`, not `127.0.0.1`.
- Every text of the two Next.js apps exists in English and Portuguese (Brazil), in `src/i18n/messages/en.json` and `pt-BR.json` of each app. Never write a text for a person in a component: `make lint` refuses it. How to add a text or a language: [docs/languages.md](docs/languages.md).
- `apps/api` keeps its packages in `apps/api/.venv`. Run its commands through `make` (`make test-api`, `make lint-api`, `make format-api`, `make migrate`). The tests of the server need the database: run `make db-up` first.
- A setting that differs per machine is a variable in `.env`, read in `apps/api/config/settings.py`, with an invented sample value in `.env.example`.
- `packages/`: code that the apps share. Exists: `packages/shared` (`@repo/shared`), the code of both Next.js apps that is not user interface; see [packages/shared/README.md](packages/shared/README.md). Exists: `packages/ui` (`@repo/ui`), the theme of this project, the theme code of both apps, and the components that only this project has; see [packages/ui/README.md](packages/ui/README.md). See [packages/README.md](packages/README.md).
- The JavaScript apps and packages are one npm workspace (root `package.json`). `apps/api` is not in it. There is one lock file, `package-lock.json` in the root folder. To add a package: write it with an exact version into the `package.json` of the app or package, then run `make install-js`.
- The web apps have no env file of their own. Their one variable, `NEXT_PUBLIC_API_BASE_URL` (the address of the server), is in the root `.env`; each `next.config.ts` loads that file.
- The components come from the npm packages `@toraline.tech/ui` and `@toraline.tech/tokens`, both in the same exact version in `apps/web`, `apps/internal` and `packages/ui`. An app imports a component from `@toraline.tech/ui` directly. Use the classes of the tokens (`bg-surface`, `text-body`), not fixed colors. After a change of `packages/ui/src/theme/theme-config.ts`, run `npm run theme --workspace packages/ui`. The steps: [docs/theme.md](docs/theme.md).
- Each checkout has its own database. A worktree gets its own port in its `.env` (`POSTGRES_PORT`, 5433 or higher). `make db-reset` and `make db-destroy` delete data: they need `CONFIRM=yes`, and the person's yes when the data is not the agent's own test data.
- `e2e/`: the end-to-end tests (Playwright), a member of the npm workspace. `make e2e` starts the server (port 8100) and `apps/web` (port 3100) with a database of their own, `<POSTGRES_DB>_e2e`, and stops what it started. A test reads its login from `SEED_ADMIN_*` and each text from the messages file of `apps/web`. Read [e2e/README.md](e2e/README.md) before adding a test. Run `make e2e` after a change of a page of `apps/web`, of a request of the server, or of the login.
- `cli/`: the two npm commands of the boilerplate, `create-toraline-monorepo` and `update-toraline-monorepo` (TypeScript, no dependency at run time). It has its own `package.json` and lock file and is not in the npm workspace of the root. `make lint-cli`, `make test-cli` and `make build-cli` are part of `make check`. Read [cli/README.md](cli/README.md) before changing it. `boilerplate/` holds the version of the boilerplate (`boilerplate/VERSION`), one updates file per release, and `boilerplate/create-manifest.json`: the files and lines that the create command changes in a copy. When you rename or delete a file that the manifest names, or change a line that it replaces, `make test-cli` fails and names the entry to correct. The formats: [docs/boilerplate-version.md](docs/boilerplate-version.md). A person publishes the commands ([docs/releasing.md](docs/releasing.md)); an agent never runs `npm publish` and never creates a release tag.
- Technical decisions and their reasons: [docs/decisions.md](docs/decisions.md).

Setup guide for people: [docs/setup-guide.md](docs/setup-guide.md). A new project that starts from this repository: [docs/start-a-new-monorepo.md](docs/start-a-new-monorepo.md). The later changes of the boilerplate, for a project that was created from it: [docs/update-a-monorepo.md](docs/update-a-monorepo.md).

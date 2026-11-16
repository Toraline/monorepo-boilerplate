# monorepo-boilerplate

The public starting point for Toraline monorepos.

It has two parts:

1. **A way of working with AI agents** that is the same in every project: 20 core skills, a team pack of 14 skills, 3 rule files, and scripts for worktrees, checks and secrets. It works in Claude Code and in Cursor. This part exists.
2. **A small sample product**: a todo list with a server, a public web app and an internal app (tags and history). The server (`apps/api`) exists with all its requests. In the web app (`apps/web`) a user logs in and manages their todos and the tags on them. In the internal app (`apps/internal`) an admin manages the tags and sees the todos of all users and the history of changes. Both are in English and Portuguese (Brazil).

Two commands do the work for you:

- **`npx create-toraline-monorepo`** creates your own monorepo from this repository: it copies it, writes the name of your project, and keeps or removes the sample product. The guide: [docs/start-a-new-monorepo.md](docs/start-a-new-monorepo.md).
- **`npx update-toraline-monorepo`**, run later inside your monorepo, finds what this repository changed since then, applies what a program can apply, and writes a plan for an AI agent, which does the rest and opens the pull request. The guide: [docs/update-a-monorepo.md](docs/update-a-monorepo.md).

Nothing in this repository is a real key or real data. Values that are yours go into `.env`, which is never committed.

## Start

To work on the boilerplate itself:

```bash
git clone git@github.com:Toraline/monorepo-boilerplate.git
cd monorepo-boilerplate
make setup
```

Docker Desktop must be running before `make setup`: it starts the database. Node 24 and Python 3.13 must be installed.

Then read [docs/setup-guide.md](docs/setup-guide.md). In Claude Code or Cursor, type `/start`.

## What is where

```
monorepo-boilerplate/
├── apps/              one folder per app (a server or a site)
│   ├── api/           the server (Django, Django REST Framework, PostgreSQL)
│   ├── web/           the public web app (Next.js), on port 3000
│   ├── internal/      the internal app, for admins only (Next.js), on port 3001
│   └── ui-catalog/    the catalog of the components (Storybook), on port 6006
├── packages/          one folder per package (code that the apps share)
│   ├── shared/        the code of both web apps that is not user interface: the requests to the server
│   └── ui/            the theme of this project and the components that only this project has
├── e2e/               the end-to-end tests: Playwright opens apps/web in a real browser
├── cli/               the two npm commands: create-toraline-monorepo and update-toraline-monorepo
├── boilerplate/       the version of this boilerplate, the updates of each release, what the create command changes
├── agent/             the way of working with AI agents
│   ├── skills/        the skills
│   ├── rules/         writing, git safety, ask-first
│   └── templates/     templates for a new skill and for a project's AGENTS.md
├── scripts/           worktree, doctor, sync, guard, secret check, database, server install
├── .github/workflows/ the automatic check on GitHub: make check, then make e2e, on each pull request to main
├── docs/              the guides to start and to update a monorepo, the setup guide, the decisions, the workflow
├── AGENTS.md          entry file for agents, with the project profile
├── Makefile           every command of the repository
├── package.json       the npm workspace: the JavaScript apps and packages
├── docker-compose.yml the database of the local machine: PostgreSQL in Docker
├── .env.example       every variable, with an invented sample value
├── .nvmrc             the Node version
└── .python-version    the Python version
```

| Path | Content |
|---|---|
| `apps/` | The apps. [apps/README.md](apps/README.md) lists them |
| `apps/api/` | The server. [apps/api/README.md](apps/api/README.md) has its folders, commands, settings and requests |
| `apps/web/`, `apps/internal/` | The two web apps. [apps/web/README.md](apps/web/README.md) and [apps/internal/README.md](apps/internal/README.md) have their folders, commands and settings |
| `apps/ui-catalog/` | The catalog of the components. [apps/ui-catalog/README.md](apps/ui-catalog/README.md) has its commands and how to add a story |
| `packages/` | The code that the apps share. [packages/README.md](packages/README.md) lists the packages |
| `e2e/` | The 2 end-to-end tests. [e2e/README.md](e2e/README.md) says how to run them and how to add a test |
| `cli/` | The code of the two npm commands. [cli/README.md](cli/README.md) has its commands and how to try a command on your machine |
| `boilerplate/` | `VERSION` (the version of this boilerplate), `updates/` (one file per release) and `create-manifest.json` (what `create-toraline-monorepo` changes in a copy). [docs/boilerplate-version.md](docs/boilerplate-version.md) |
| `.github/workflows/release.yml` | The workflow "Release", started by hand: it publishes the two commands to npm and creates the tag of the version. [docs/releasing.md](docs/releasing.md) |
| `docs/repositories.md` | The list of the repositories that were created from this boilerplate |
| `package.json`, `package-lock.json` | The npm workspace. It links the JavaScript apps and packages. `apps/api` is Python and is not in it |
| `.nvmrc` | The Node version: 24 |
| `.python-version` | The Python version: 3.13. The server `apps/api` needs it |
| `Makefile` | Every command. `make help` lists them |
| `docker-compose.yml` | One PostgreSQL 17 server in Docker, for the local machine. Each checkout has its own |
| `.env.example` | Every variable with an invented sample value. `.env` is your copy; git ignores it |
| `AGENTS.md` | Entry file for agents, with the project profile |
| `agent/skills/` | The skills. `.claude/skills` and `.cursor/skills` are links to this folder |
| `agent/rules/` | Writing, git safety, ask-first |
| `agent/templates/` | Templates for a new skill and for a project's `AGENTS.md` |
| `scripts/` | Worktree, doctor, sync, guard, secret check, the database commands, the install of the server |
| `docs/start-a-new-monorepo.md` | How to start your own monorepo from this repository: the command, or 11 steps by hand |
| `docs/update-a-monorepo.md` | How a monorepo gets the later changes of the boilerplate: the command `update-toraline-monorepo` and the skill `/update-boilerplate` |
| `docs/setup-guide.md` | How to set this up on your machine and in your own project |
| `docs/languages.md` | English and Portuguese (Brazil) in the web apps: how to add a text and a language |
| `docs/theme.md` | The theme of the web apps: how to change a color, add a component of the project, update the component library |
| `docs/decisions.md` | The technical decisions, each with its reason |
| `docs/workflow/` | The flow, where things live, the skill catalog, the model for a new module |
| `local-docs/` | Your private notes. Made per user, never committed |

## Use the core in another project

```bash
bash ~/code/repos/monorepo-boilerplate/scripts/sync-skills.sh /path/to/your/project
```

The steps are in the setup guide.

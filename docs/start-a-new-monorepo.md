# Start a new monorepo from this boilerplate

How to make your own repository from this one: a new monorepo that runs on your machine, with its own name, its own theme, its own Linear project, and with or without the sample todo product.

There are two ways. Both give the same result.

1. **The command.** `npx create-toraline-monorepo` does steps 1, 2, 3, 5 and 9 of this page for you. Use this way. It is the section "The first way: the command" below.
2. **By hand.** You do steps 1 to 11 of this page yourself, in order. It is the section "The second way: by hand".

Each step says what to run and how you see that it worked.

## Context you need before reading

- **Boilerplate**: this repository, `Toraline/monorepo-boilerplate`. It is a starting point: you copy it once, and the copy is yours.
- **Monorepo**: one repository that holds several apps and the code they share.
- **Sample product**: the small todo list that the boilerplate comes with: a server, a web app for users and an internal app for admins. It shows where each kind of code goes. You keep it as a model, or you remove it.
- **Server**: the program in `apps/api` (Python, Django). **Web apps**: `apps/web` and `apps/internal` (Next.js). **Catalog**: `apps/ui-catalog` (Storybook), a site that shows each component.
- **Project profile**: the table in `AGENTS.md` with the values that differ between projects, for example the key of your Linear team.
- **Linear**: the tool that holds the tickets. **Team key**: the letters before the number of a ticket, for example `ABC` in `ABC-12`.
- **`.env`**: a file in the root folder with the values of your machine. Git ignores it. `.env.example` has every variable with an invented sample value.
- **First admin**: the first user of the server. `make setup` creates it from 3 lines of `.env`.
- **Theme**: the colors of the web apps, in a light and a dark version.
- **Worktree**: a second folder of the same repository on its own branch. After this guide, each ticket gets one.

## What you choose before you start

Write these 4 values down. The steps use them. The examples on this page use the values of the second column.

| Value | Example on this page | Rule |
|---|---|---|
| The name of the project | `my-project` | Small letters, digits and dashes. It becomes the name of the folder and of the repository |
| The owner on GitHub | `my-owner` | Your GitHub user name, or the name of your GitHub organization |
| The key of your Linear team | `ABC` | The team must exist in Linear. Step 4 says where you find the key |
| The name of the database | `my_project` | Small letters, digits and underscores. No dash |

You also need the tools of section 1 of the [setup guide](setup-guide.md): git, Docker Desktop, Node 24, nvm, Python 3.13, make, the GitHub CLI, and Claude Code or Cursor.

## The first way: the command

1. Open a terminal in the folder where you keep your repositories.
2. Run the command:

   ```bash
   npx create-toraline-monorepo
   ```

   It asks 5 questions, one at a time. Press Enter to take the default in the brackets.

   | Question | Default | What it becomes |
   |---|---|---|
   | The folder of the new monorepo | `my-project` | The folder is created. It must not exist yet, or be empty |
   | The name of the project | The name of the folder | Step 2: the name in the files |
   | The ticket prefix | `ABC` | Step 3: the row `ticket_prefix` of the project profile |
   | The name of the database | The project name, with `_` for each `-` | Step 2, point 4 |
   | Keep the sample todo product? | `yes` | Step 9. With `no` the command removes it |

   It worked when: the output has the line `Created <folder> from the boilerplate <version>.`, and then the list "Next steps".

3. The command downloads the boilerplate from GitHub, at the newest release. The boilerplate is public: git needs the network and no login. When it stops with `The boilerplate could not be read`, run `git ls-remote --tags https://github.com/Toraline/monorepo-boilerplate.git`. It must print one line per release. With no network, give the command a local copy of the boilerplate: `--source <folder>`.

What the command did, in the new folder:

- Steps 1, 2 (points 1, 4, 5 and 6), 3 (point 2) and 5 (point 1) of the second way. With the answer `no` to the last question, also step 9, points 1 to 10 and point 12: the code of the sample product is removed, and the documents no longer describe it.
- It wrote a starting text at the top of `README.md` and `AGENTS.md`, with one line in italics that you replace with 2 sentences about your project.
- It wrote the record file `.toraline-monorepo.json`: the version of the boilerplate that your monorepo was created from. The command `npx update-toraline-monorepo` reads it later ([update-a-monorepo.md](update-a-monorepo.md)).
- It removed the files that belong only to the boilerplate itself, also the file `LICENSE`, the line `"license"` of `package.json` and the section "License" of `README.md` (step 1, point 5).
- It removed the files `SECURITY.md` and `CONTRIBUTING.md` and the 2 pictures of `README.md`, which are about the boilerplate, and it replaced `docs/decisions.md` with an empty list for the decisions of your project (step 1, point 6). It does this with and without the sample product.
- It made the first commit: `chore: start from the boilerplate <version>`.

What the command did not do. Do these next, in this order:

1. Step 4: connect GitHub and Linear. The command never creates a repository on GitHub, a project in Linear or an account.
2. Step 5, point 2: change `POSTGRES_PORT` in `.env` when another PostgreSQL uses port 5432 on your machine.
3. Steps 6 and 7: the setup, and the first login.
4. Step 2, point 3: write 2 sentences about your project at the top of `AGENTS.md` and of `README.md`, in the place of the line in italics.
5. Step 8: the theme.
6. Choose the license of your project. The new folder has no file `LICENSE`. When you want one, add a file `LICENSE` and the line `"license"` to `package.json`.
7. Steps 10 and 11: the checks, the repository on GitHub, the protection of its branch `main` (`make protect-main`: step 10, point 5), and the start of the work.

### The command with no question

For an agent or a script. `--yes` gives every value with no flag its default.

```bash
npx create-toraline-monorepo my-project --yes --ticket-prefix ABC --database-name my_project --remove-sample
```

| Flag | Meaning |
|---|---|
| `--dir <folder>`, or the first word after the command | The folder |
| `--name <name>` | The name of the project |
| `--ticket-prefix <KEY>` | The key of your Linear team |
| `--database-name <name>` | The name of the database |
| `--keep-sample`, `--remove-sample` | Keep or remove the sample todo product |
| `--yes` | Ask no question |
| `--owner <name>` | Your user or organization on GitHub, for the 2 `git clone` lines of the documents. Default: `my-owner` |
| `--database-port <port>` | The port of the database on your machine, written into `.env` |
| `--source <folder or git address>` | Another place to get the boilerplate from. The environment variable `TORALINE_BOILERPLATE_SOURCE` does the same |
| `--ref <tag or branch>` | Another tag or branch of the boilerplate. Default: the newest release tag |
| `--help` | Every flag |

## The second way: by hand

Steps 1 to 11. With the command of the first way, you do only the steps that its list above names.

## Step 1. Create the repository from the boilerplate

1. Open a terminal in the folder where you keep your repositories.
2. Copy the boilerplate into a folder with the name of your project:

   ```bash
   git clone https://github.com/Toraline/monorepo-boilerplate.git my-project
   ```

3. Enter the folder:

   ```bash
   cd my-project
   ```

4. Delete the history of the boilerplate, and start a history of your own:

   ```bash
   rm -rf .git
   git init -b main
   git add -A
   git commit -m "chore: start from the boilerplate"
   ```

5. The license. The file `LICENSE` holds the license of the boilerplate (MIT, copyright Toraline). Your project chooses its own license. Do one of the two:
   - **You want no license yet, or another one:** delete the file `LICENSE`, delete the line `"license": "MIT",` in `package.json`, and delete the row `LICENSE` of the table and the section "License" at the end of `README.md`. Add your own license later.
   - **You want the MIT license for your project too:** keep the file, and write your own name in its line `Copyright (c)`, under a line that keeps the notice of the boilerplate. In `README.md`, delete the second paragraph of the section "License".

6. The files that are about the boilerplate itself. Run this before you delete the folder `boilerplate/`:

   ```bash
   rm SECURITY.md CONTRIBUTING.md
   rm -r docs/images
   cp boilerplate/new-project/docs/decisions.md docs/decisions.md
   ```

   - `SECURITY.md` and `CONTRIBUTING.md` say how to report a problem of the boilerplate. Write your own when your project is public.
   - `docs/decisions.md` becomes an empty list for the decisions of your project. The decisions of the boilerplate stay in the boilerplate.
   - In `README.md`, delete the text from the first line under the title down to the line "The pictures show the sample product with invented sample data.", the rows `SECURITY.md`, `CONTRIBUTING.md` and `docs/images/` of the table, and the section "Security and contributions". Step 2, point 3 writes 2 sentences about your project in that place.

It worked when: `git log --oneline` prints exactly 1 line, and `ls` shows `Makefile`, `apps`, `packages` and `agent`.

You create the repository on GitHub in step 10, after the checks pass. Until then everything is only on your machine.

## Step 2. Rename the project

Run every command of this page from the root folder of your project.

1. Change the name in these 5 files. In each line, write the name of your project where the table says `my-project`, and your owner where it says `my-owner`.

   | File | Line today | Line after the change |
   |---|---|---|
   | `package.json` | `"name": "monorepo-boilerplate",` | `"name": "my-project",` |
   | `Makefile`, line 1 | `# monorepo-boilerplate: run every command from the repository root.` | `# my-project: run every command from the repository root.` |
   | `AGENTS.md`, line 1 | `# monorepo-boilerplate: instructions for agents` | `# my-project: instructions for agents` |
   | `README.md` | `# monorepo-boilerplate`, the line `monorepo-boilerplate/` at the top of the folder tree, and, in the section "Try it", the 2 lines `git clone https://github.com/Toraline/monorepo-boilerplate.git` and `cd monorepo-boilerplate` | `# my-project`, `my-project/`, `git clone git@github.com:my-owner/my-project.git` and `cd my-project` |
   | `docs/setup-guide.md`, step 1 | `git clone https://github.com/Toraline/monorepo-boilerplate.git` and `cd monorepo-boilerplate` | `git clone git@github.com:my-owner/my-project.git` and `cd my-project` |

2. Do not change the other lines that name `monorepo-boilerplate`. They are in `README.md` (the section "Use the core in another project"), in `docs/setup-guide.md` (section 5), in `scripts/sync-skills.sh` and in `scripts/doctor.sh`. They name the place where your project gets newer skills from, which is the boilerplate.
3. In `AGENTS.md`, replace the paragraph under the first line with 2 sentences about your project. Do the same with the first paragraphs of `README.md`.
4. Give the database the name of your project. The sample name is `todo`. Change it in these 3 files:

   | File | Line today | Line after the change |
   |---|---|---|
   | `.env.example` | `POSTGRES_USER=todo` and `POSTGRES_DB=todo` | `POSTGRES_USER=my_project` and `POSTGRES_DB=my_project` |
   | `docker-compose.yml` | `${POSTGRES_USER:-todo}` and `${POSTGRES_DB:-todo}` | `${POSTGRES_USER:-my_project}` and `${POSTGRES_DB:-my_project}` |
   | `.github/workflows/check.yml` | `POSTGRES_USER: todo`, `POSTGRES_DB: todo` and `pg_isready -U todo -d todo` | `POSTGRES_USER: my_project`, `POSTGRES_DB: my_project` and `pg_isready -U my_project -d my_project` |

   The 3 files must hold the same name: the automatic check on GitHub copies `.env.example` to `.env`.

5. Give the web apps their name. It is the title of the browser tab and of the start page of the internal app. Change these texts in the 4 messages files:

   | File | Key | Text today |
   |---|---|---|
   | `apps/web/src/i18n/messages/en.json` | `metadata.title`, `metadata.description` | `Todo list`, `The web app of the sample product: a todo list.` |
   | `apps/web/src/i18n/messages/pt-BR.json` | `metadata.title`, `metadata.description` | `Lista de tarefas`, `O aplicativo web do produto de exemplo: uma lista de tarefas.` |
   | `apps/internal/src/i18n/messages/en.json` | `metadata.title`, `metadata.description`, `home.title` | `Todo list admin` (2 times), `The internal app of the sample product, for admins only.` |
   | `apps/internal/src/i18n/messages/pt-BR.json` | `metadata.title`, `metadata.description`, `home.title` | `Administração da lista de tarefas` (2 times), `O aplicativo interno do produto de exemplo, só para administradores.` |

6. One test names the title of the internal app. Open `apps/internal/src/app/(admin)/page.test.tsx` and write your new texts where it says `Todo list admin` and `Administração da lista de tarefas`.

It worked when, after step 6: this command prints only lines of the 4 files of point 2:

```bash
grep -rn "monorepo-boilerplate" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.venv --exclude-dir=.next
```

Before step 6 it also prints 2 lines of `package-lock.json`. That file gets the new name by itself in step 6.

## Step 3. Fill the project profile in `AGENTS.md`

1. Open `AGENTS.md` and find the table under "Project profile".
2. Change the value of `ticket_prefix` from `TOR` to the key of your Linear team, for example `ABC`.
3. Read the other rows. Change a value only when your project differs:

   | Key | Value in the boilerplate | Change it when |
   |---|---|---|
   | `packs` | `core, team` | You work alone and want fewer skills: write `core` |
   | `base_branch` | `main` | Your pull requests target another branch |
   | `main_checkout` | `protected` | You want to commit in the folder you cloned: write `open` |
   | `push` | `push` | The agent must ask before each push: write `ask` |
   | `output_language` | `English` | The agent must write for you in another language |
   | `finished_status` | `Needs QA` | Your Linear team has no status with this name: write the name of a status that exists |

4. Leave the 3 rows that say `<ask>` (`review_rules`, `release_branches`, `required_reviewers`). The skill `/start` asks for them the first time it runs.

It worked when: this command prints your key:

```bash
bash scripts/profile.sh get ticket_prefix
```

More about each key: section 4 of the [setup guide](setup-guide.md).

## Step 4. Connect GitHub and Linear

1. Sign in to GitHub in the terminal:

   ```bash
   gh auth login
   ```

   It worked when: `gh auth status` prints `Logged in to github.com`.

2. In Linear, find the key of your team: open **Settings**, then **Teams**, then your team. The field **Identifier** holds the key. It must be the value of `ticket_prefix` of step 3.
3. In Linear, create a project for the work of this repository: open your team, then **Projects**, then **New project**. Give it the name of your project.
4. Check that your team has the status of the row `finished_status` of step 3 (in the boilerplate: `Needs QA`): open **Settings**, then **Teams**, then your team, then **Workflow**. Create the status when it is missing.
5. Connect the agent to Linear. The repository already names the Linear server in `.mcp.json` (Claude Code) and in `.cursor/mcp.json` (Cursor). No key goes into a file.
   - Claude Code: open the folder of your project in Claude Code, and sign in to Linear when it asks.
   - Cursor: open **Cursor Settings**, then **MCP**, then `linear`, and sign in.

It worked when: in Claude Code or Cursor, the question "List my Linear teams" gets an answer that names your team.

## Step 5. Create `.env`

1. Create the file:

   ```bash
   make env
   ```

   It worked when: the output has the line `.env: created from .env.example`.

2. The sample values work on your own machine as they are. Change a value only in these 2 cases:

   | Case | What to change in `.env` |
   |---|---|
   | Another PostgreSQL already runs on port 5432 of your machine | The line `POSTGRES_PORT=5432`: write a free port, for example `POSTGRES_PORT=5433`. Without this change, step 6 stops with the line `Port 5432 is already in use by another program` |
   | You want your own email and password for the first admin | The lines `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` and `SEED_ADMIN_NAME` |

Never commit `.env`. Git ignores it. Never write a real key or a real password into `.env.example`.

## Step 6. Run the setup

1. Open Docker Desktop and wait until it shows that the engine is running.
2. Install and select the Node version of the file `.nvmrc`:

   ```bash
   nvm install
   ```

3. Run the setup:

   ```bash
   make setup
   ```

It does 9 things, in this order: turns on the secret check, creates `local-docs/`, creates `.env` when it does not exist, checks the machine, installs the JavaScript packages, installs the server, starts the database, creates the tables, creates the first admin.

It worked when: the last 2 lines are:

```
Setup finished. The database is running. Stop it with: make db-down
Start the server and the web apps with: make run
```

If it stops at a line that starts with `FAIL` or with `Port`: the line says how to fix it. Fix it and run `make setup` again. It is safe to run it more than once.

More about each thing that `make setup` does: section 2 of the [setup guide](setup-guide.md).

## Step 7. Create the first admin, and log in

`make setup` already created the first admin, from the lines `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` and `SEED_ADMIN_NAME` of `.env`. This step checks it.

1. Run the command again. It is safe:

   ```bash
   make seed
   ```

   It worked when: the last line is `The user admin@example.com already exists. Nothing was changed.` (with your email when you changed it in step 5).

2. Start the server and the web apps:

   ```bash
   make run
   ```

   It worked when: the output has the line `Starting development server at http://127.0.0.1:8000/` and 2 lines that start with `- Local:`, and the command keeps running.

3. Open `http://localhost:3000` in the browser. Type `localhost`, not `127.0.0.1`. Type the email and the password of the first admin and press "Log in".

   It worked when: the page shows "Logged in as Sample Admin" at the top right (with your name when you changed it), and the title "Your todos".

4. Open `http://localhost:3001`, the internal app. It worked when: it shows the menu "Tags", "Todos", "History".
5. Open `http://localhost:8000/admin/`. There you create the other users: "Users", then "Add user".
6. Press Ctrl+C in the terminal to stop the server and the web apps.

## Step 8. Change the theme

The boilerplate has a violet main color. Give your project its own.

1. Open `packages/ui/src/theme/theme-config.ts`.
2. In the theme `light`, write your colors as the values of these 9 keys: `bg-primary`, `bg-primary-hover`, `bg-primary-subtle`, `bg-primary-muted`, `bg-selected`, `text-brand`, `border-brand`, `border-focus`, `icon-brand`. Example, a green main color:

   ```ts
   "bg-primary": "#15803d",
   "bg-primary-hover": "#166534",
   ```

3. In the theme `dark`, change the same 9 keys. A dark theme needs a pale main color, for example `"bg-primary": "#86efac"`.
4. Write the CSS file of the theme again:

   ```bash
   npm run theme --workspace packages/ui
   ```

   It worked when: the last line is `Wrote src/theme/theme.generated.css with 2 themes.`

5. Two test files name the main color. Write your 2 values of `bg-primary` (light, then dark) where they say `#6d28d9` and `#c4b5fd`:
   - `packages/ui/src/theme/theme-config.test.ts`, the line `expect(mainColors).toEqual(["#6d28d9", "#c4b5fd"]);`
   - `packages/ui/src/theme/theme-css.test.ts`, the 2 lines that contain `--bg-primary:`
6. Run the tests of the theme:

   ```bash
   make test-ui
   ```

   It worked when: the output has a line that starts with `Tests` and ends with `passed`. A test fails when a color has too little contrast: the message names the 2 colors. Choose a darker color in the light theme, or a paler one in the dark theme.

7. Look at the result:

   ```bash
   make catalog
   ```

   The catalog opens on `http://localhost:6006`. Open **Theme**, then **Change the theme**. Change between the 2 themes with the control **Theme** of the toolbar. Press Ctrl+C in the terminal to stop the catalog.

The full document, with the list of the tokens and the fonts: [theme.md](theme.md).

## Step 9. Keep or remove the sample todo product

Choose one:

- **Keep it** while you build your first own module. It is the model: [docs/workflow/module-model.md](workflow/module-model.md) names it, and the skill `/new-module` reads that file. Remove it later with the steps below. Then go to step 10.
- **Remove it now**, with the steps below.

What stays in both cases: the login, the users, the Django admin, the 2 languages, the theme, the components of `packages/ui`, the catalog, the checks.

### The files that hold the sample product

These files and folders exist only for the todo list. Delete them:

| Path | What it is |
|---|---|
| `apps/api/apps/todos/` | The server part: todos, tags, history, their requests, their tests, and the command `seed_sample` |
| `apps/web/src/features/todos/` | The todo list of a user, its forms and its tests |
| `apps/web/src/features/tags/` | The request for the tags, for the form and the filter of the todo list |
| `apps/web/src/components/text-area-field.tsx` | The description field of the todo form |
| `apps/internal/src/features/tags/`, `apps/internal/src/features/todos/`, `apps/internal/src/features/history/` | The 3 areas of the internal app |
| `apps/internal/src/app/(admin)/tags/`, `apps/internal/src/app/(admin)/todos/`, `apps/internal/src/app/(admin)/history/` | The pages of the 3 areas |
| `packages/ui/src/components/tag-badge.tsx`, `packages/ui/src/components/tag-badge.test.tsx` | The component that shows one tag |
| `apps/ui-catalog/stories/project/TagBadge.stories.tsx` | The stories of that component |
| `e2e/tests/create-todo.spec.ts` | The end-to-end test "create a todo" |

These files stay, and each has lines that name the sample product. Change them as the steps below say:

| File | What names the sample product |
|---|---|
| `apps/api/config/settings.py` | The line `"apps.todos",` and the setting `SEED_SAMPLE_PASSWORD` |
| `apps/api/config/urls.py` | 3 lines with `todos` |
| `Makefile` | The command `seed-sample` |
| `.env.example`, `.env` | The line `SEED_SAMPLE_PASSWORD` and its 3 comment lines |
| `apps/web/src/app/(app)/page.tsx`, `apps/web/src/app/(app)/page.test.tsx` | The start page shows the todo list |
| `apps/web/src/i18n/messages/en.json`, `pt-BR.json` | The group `todos` |
| `apps/internal/src/features/auth/components/admin-menu.tsx` | The 3 links of the menu |
| `apps/internal/src/features/auth/components/require-admin.test.tsx` | 2 tests name the 3 links |
| `apps/internal/src/i18n/messages/en.json`, `pt-BR.json` | The groups `tags`, `todos`, `history`, 3 keys of the group `menu`, and the text of `home.description` |
| `apps/internal/src/app/(admin)/page.test.tsx` | The text of `home.description` |
| `packages/ui/src/components/index.ts` | The line that exports `TagBadge` |
| `e2e/tests/support/login.ts`, `e2e/tests/login.spec.ts` | They wait for the title of the todo list |
| `apps/api/README.md`, `apps/web/README.md`, `apps/internal/README.md`, `e2e/README.md`, `docs/start-a-new-monorepo.md` | Text about the todo list in most sections. `boilerplate/without-sample/` has a version of each file without it |
| `README.md`, `AGENTS.md`, `apps/README.md`, `packages/ui/README.md`, `apps/ui-catalog/README.md`, `docs/setup-guide.md`, `docs/theme.md`, `docs/workflow/working-pattern.md`, `docs/workflow/module-model.md` | Some lines about the todo list, the tags, the history or the component `TagBadge` |

These files are not part of the todo list, but only the todo list uses them today. Keep them for your own lists, or delete them: `apps/internal/src/features/users/` (the list of the users, for a filter), `apps/internal/src/components/list-pagination.tsx`, `apps/internal/src/lib/format/use-date-time-format.ts`, and the group `pagination` of the messages files of `apps/internal`.

### Remove it

1. Delete the files and folders of the first table:

   ```bash
   rm -rf apps/api/apps/todos
   rm -rf apps/web/src/features/todos apps/web/src/features/tags apps/web/src/components/text-area-field.tsx
   rm -rf apps/internal/src/features/tags apps/internal/src/features/todos apps/internal/src/features/history
   rm -rf "apps/internal/src/app/(admin)/tags" "apps/internal/src/app/(admin)/todos" "apps/internal/src/app/(admin)/history"
   rm packages/ui/src/components/tag-badge.tsx packages/ui/src/components/tag-badge.test.tsx
   rm apps/ui-catalog/stories/project/TagBadge.stories.tsx
   rm e2e/tests/create-todo.spec.ts
   ```

2. The server. In `apps/api/config/settings.py`, delete the line `"apps.todos",` and the 3 lines of `SEED_SAMPLE_PASSWORD` (2 comment lines and the setting). In `apps/api/config/urls.py`, delete these 3 lines:

   ```python
   from apps.todos import urls as todos_urls
       path("api/", include("apps.todos.urls")),
       path("api/admin/", include(todos_urls.admin_urlpatterns)),
   ```

3. The sample data command. In the `Makefile`, delete the target `seed-sample` (its comment line, the line that starts with `seed-sample:` and the line under it), and delete the word `seed-sample` in the list `.PHONY` at the top. In `.env.example` and in `.env`, delete the line `SEED_SAMPLE_PASSWORD=` and the 3 comment lines above it.
4. The start page of the web app. Replace the content of `apps/web/src/app/(app)/page.tsx` with:

   ```tsx
   import { useTranslations } from "next-intl";

   // The start page of a user who is logged in.
   export default function HomePage() {
     const t = useTranslations("home");

     return (
       <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-8">
         <h1 className="heading-page m-0 text-brand">{t("title")}</h1>
         <p className="m-0 text-body">{t("description")}</p>
       </main>
     );
   }
   ```

   Replace the content of `apps/web/src/app/(app)/page.test.tsx` with:

   ```tsx
   import { screen } from "@testing-library/react";
   import { describe, expect, it } from "vitest";

   import { renderWithMessages } from "@/test/render";

   import HomePage from "./page";

   describe("HomePage", () => {
     it("shows the title of the start page", () => {
       renderWithMessages(<HomePage />);

       expect(
         screen.getByRole("heading", { level: 1, name: "Start page" }),
       ).toBeInTheDocument();
     });
   });
   ```

5. The texts of the web app. In `apps/web/src/i18n/messages/en.json`, delete the whole group `"todos": { ... }`, and add this group. Mind the comma between two groups:

   ```json
   "home": {
     "title": "Start page",
     "description": "You are logged in. This app has no page of its own yet."
   }
   ```

   In `apps/web/src/i18n/messages/pt-BR.json`, delete the group `"todos"` and add:

   ```json
   "home": {
     "title": "Página inicial",
     "description": "Você entrou. Este aplicativo ainda não tem nenhuma página própria."
   }
   ```

6. The menu of the internal app. In `apps/internal/src/features/auth/components/admin-menu.tsx`, replace the list `AREAS` with one link to the start page. You add your own areas to this list later.

   ```ts
   const AREAS = [{ id: "home", path: "/" }] as const;
   ```

7. The texts of the internal app. In `apps/internal/src/i18n/messages/en.json` and `pt-BR.json`:
   - Delete the groups `"tags"`, `"todos"` and `"history"`.
   - In the group `"menu"`, delete the keys `"tags"`, `"todos"` and `"history"`, and add `"home": "Start"` (English) and `"home": "Início"` (Portuguese).
   - In the group `"home"`, write a new text for `"description"`: `"This app has no area yet."` (English) and `"Este aplicativo ainda não tem nenhuma área."` (Portuguese).
8. The tests of the internal app.
   - In `apps/internal/src/app/(admin)/page.test.tsx`, replace `Choose an area in the menu: tags, todos or history.` with `This app has no area yet.`
   - In `apps/internal/src/features/auth/components/require-admin.test.tsx`, in the test "gets in: the page, the menu with the 3 areas, and the logout button": replace the list of the 3 links with `[["Start", "/"]]`, and delete the 2 checks under it that name the links "Todos" and "Tags" (7 lines, each check starts with `expect(screen.getByRole("link"`).
   - In the same file, in the test "shows the menu in Portuguese on a Portuguese page": replace the 2 lines that name "Etiquetas" and "Histórico" with `expect(screen.getByRole("link", { name: "Início" })).toBeInTheDocument();`
9. The tag component. In `packages/ui/src/components/index.ts`, delete the line `export { TagBadge, type TagBadgeProps } from "./tag-badge";`
10. The end-to-end test of the login. In `e2e/tests/support/login.ts`, replace `messages.todos.title` with `messages.home.title`. In `e2e/tests/login.spec.ts`, replace the last 2 checks (the title of the todo list and the button "New todo") with:

    ```ts
    await expect(
      page.getByRole("heading", { name: messages.home.title }),
    ).toBeVisible();
    ```

11. The database of your machine still has the tables of the todo list. Empty it and create the tables and the first admin again. This deletes every row of the database of this folder:

    ```bash
    make db-reset CONFIRM=yes
    make seed
    ```

    It worked when: the last line is `The first admin was created: admin@example.com` (with your email when you changed it).

12. The documents. The command `npx create-toraline-monorepo` does this point for you. By hand:
    1. Do this point before you delete the folder `boilerplate/`. Copy the 5 documents of `boilerplate/without-sample/` over the files with the same paths.

       ```bash
       for file in apps/api/README.md apps/web/README.md apps/internal/README.md e2e/README.md docs/start-a-new-monorepo.md; do
         cp "boilerplate/without-sample/$file" "$file"
       done
       ```

    2. Delete `docs/workflow/module-model.md`. It names the todo product as the model for a new module. Write it again when your first own module exists.
    3. In the 8 other files of the last row of the second table, delete or change the lines about todos, tags, history and `TagBadge`. The exact lines are the entries of the list `replace` of the group `sampleProduct` in `boilerplate/create-manifest.json` whose `file` ends with `.md`.

    It worked when: this command prints nothing.

    ```bash
    grep -rli "todo" --include='*.md' --exclude-dir=node_modules --exclude-dir=agent --exclude-dir=boilerplate . | grep -v "docs/workflow/status-skills.md"
    ```

    `docs/workflow/status-skills.md` names "Todo", a status of a ticket in Linear. That is not the sample product.

It worked when: step 10 passes.

## Step 10. Run the checks, commit, and put the repository on GitHub

1. Run the checks. The database must be running (`make db-up`).

   ```bash
   make check
   ```

   It worked when: the last line is `Check passed.`

2. Run the end-to-end tests:

   ```bash
   make e2e
   ```

   It worked when: the output has the line `2 passed` (or `1 passed` when you removed the sample product).

3. Commit:

   ```bash
   git add -A
   git commit -m "chore: name the project, set the theme"
   ```

   The secret check runs before the commit. It refuses a commit that adds a token, a private key or a connection string with a password.

4. Create the repository on GitHub and send your commits. `--private` makes a repository that only you see; write `--public` for a public one.

   ```bash
   gh repo create my-owner/my-project --private --source . --remote origin --push
   ```

   It worked when: `git status` prints `Your branch is up to date with 'origin/main'`.

5. Protect the branch `main` on GitHub. Do it right after point 4:

   ```bash
   make protect-main
   ```

   It prints the rule and asks `Create it now? Type yes:`. With `yes` it creates one ruleset with the name `protect-main` in the settings of the repository on GitHub. The ruleset has 4 rules for `main`: a change needs a pull request (no approval is required, so you can work alone); the check `check` must pass before the merge; no force push; the branch cannot be deleted.

   It worked when: the output has the line `Created the ruleset "protect-main" in my-owner/my-project.`

   - It needs the `gh` command, logged in as an admin of the repository.
   - When it says that the plan does not allow rulesets on a private repository: GitHub gives rulesets to a private repository only with a paid plan. Make the repository public, change the plan, or leave `main` without the rule.
   - To do it later, run the same command. A second run changes nothing: it prints `my-owner/my-project already has a ruleset named "protect-main". Nothing was changed.`
   - The skill `/start` asks the same question once, "Protect the branch main now?", when the repository is on GitHub and has no ruleset.

From now on, `main_checkout` is `protected`: the agent makes no change in this folder. Each ticket gets a worktree, a branch and a pull request. Each pull request to `main` runs `make check` and `make e2e` on GitHub; it needs no key and no setting.

## Step 11. Start working

1. Open the folder of your project in Claude Code or Cursor.
2. Type `/start`. The first time, it asks for the profile values that still say `<ask>`.
3. To define your own product before any code, type `/define-app`. To add a module to the server and to an app, type `/new-module`. To add an app, type `/new-app`.

The flow of one piece of work: [docs/workflow/working-pattern.md](workflow/working-pattern.md). Every command of the repository: `make help`.

When you stop working, stop the database. The data stays.

```bash
make db-down
```

## How this guide was checked

Checked on 2026-11-15, on macOS, in a new folder outside every repository. The folder was a copy of the boilerplate as it was just before this guide was added, with the catalog and the end-to-end tests. The project name of the run was the name of the folder.

| Step | What was run | Result |
|---|---|---|
| 1 | The 4 commands of point 4. The copy came from a local folder, not from GitHub | 1 commit, the folders are there |
| 2 | Points 1, 4, 5 and 6: the name in the 5 files, the database name in the 3 files, the titles in the 4 messages files and the test; the command under "It worked when" | `make test-api`, `make test-web`, `make test-internal` passed; the database answered with the new name and the new user; the command printed lines of the 4 files only |
| 3 | Point 2: `ticket_prefix`; `bash scripts/profile.sh get ticket_prefix` | The command printed the new key |
| 5 | `make env`, then `POSTGRES_PORT` changed, because another PostgreSQL used port 5432 on that machine | With the sample port, `make setup` stopped with the line `Port 5432 is already in use by another program`. With a free port it passed |
| 6 | `make setup` | The last 2 lines were the ones of step 6 |
| 7 | `make seed` after the setup; `make run`; `curl http://localhost:8000/api/health/`; the login request of the server with the first admin; the login pages of both web apps | `{"status":"ok","database":"ok"}`; the login answered with the first admin; both login pages answered |
| 8 | Points 1 to 6 with a green main color; the login page of `apps/web` in a browser | `make test-ui`: 58 tests passed. The button "Log in" was `rgb(134, 239, 172)` (`#86efac`) in the dark theme |
| 9 | Every point of "Remove it" except point 12 | `make check` passed: 58 tests of the server, 29 of `apps/web`, 29 of `apps/internal`, 103 of `packages/shared`, 56 of `packages/ui`, and the 3 builds. After `make db-reset CONFIRM=yes` and `make seed`, the database had no table of the todo list |
| 10 | `make check`, `make e2e`, `git add -A`, `git commit` | `Check passed.`; `1 passed`; the commit passed the secret check |

The command of the first way was checked on 2026-11-15, on macOS, with a local copy of the boilerplate as its source (`--source`), two times: with `--keep-sample` and with `--remove-sample`. In both new folders `make setup` and `make check` passed. With `--keep-sample`: 170 tests of the server, 71 of `apps/web`, 98 of `apps/internal`, 103 of `packages/shared`, 58 of `packages/ui`. With `--remove-sample`: 58, 29, 29, 103 and 56, and `make e2e` printed `1 passed`.

The removal of the sample product from the documents (step 9, point 12, done by the command) was checked on 2026-11-16, on macOS, with a local copy of the boilerplate as the source and `--remove-sample`. In the new folder `make setup` and `make check` passed: 58 tests of the server, 29 of `apps/web`, 29 of `apps/internal`, 103 of `packages/shared`, 56 of `packages/ui`. The command under "It worked when" of point 12 printed nothing.

Not run:

- The command with GitHub as its source. The runs above were made before the first release (`0.1.0`, 2026-11-16) and were not repeated after it.
- Step 1, the clone from GitHub. Step 10, point 4: no repository was created on GitHub, so the automatic check did not run for the new project.
- Step 2, point 3 (the 2 sentences about the project).
- Step 3, point 3: no other value of the profile was changed.
- Step 4: no sign-in to GitHub or Linear, no Linear project. The names of the Linear pages in step 4 were not compared with Linear.
- Step 6, `nvm install`: the machine already had Node 24.
- Step 7, points 3 to 5 in a browser with the todo list: the login was checked with the login request of the server and with the end-to-end test.
- Step 8, point 7: the catalog was not opened in the copy. It was opened in the boilerplate itself.
- Step 9, point 12 by hand (the documents). The command did it.
- Step 11: no skill was run in the copy.
- Windows and Linux.

## Status

- **Done:** the command `npx create-toraline-monorepo`, the 11 steps by hand, the list of the files of the sample product, the check of the steps in a copy.
- **Not done:** a deploy guide. The command was not run against GitHub: it was run with a local copy of the boilerplate as its source.
- **What you must do:** the first way, then the steps that the command did not do.

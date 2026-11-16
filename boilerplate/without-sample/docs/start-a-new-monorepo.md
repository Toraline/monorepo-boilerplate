# Start this monorepo

This monorepo was created from the Toraline monorepo boilerplate, without the sample product of the boilerplate. This page lists what is already done, and the steps that you do next: connect the tools, run the setup, change the theme, put the repository on GitHub.

Each step says what to run and how you see that it worked. The steps keep the numbers of the guide of the boilerplate, so the next steps that `npx create-toraline-monorepo` printed name the same numbers.

## Context you need before reading

- **Boilerplate**: the repository `Toraline/monorepo-boilerplate` on GitHub. This monorepo is a copy of it. The copy is yours.
- **Monorepo**: one repository that holds several apps and the code they share.
- **Server**: the program in `apps/api` (Python, Django). **Web apps**: `apps/web` and `apps/internal` (Next.js). **Catalog**: `apps/ui-catalog` (Storybook), a site that shows each component.
- **Project profile**: the table in `AGENTS.md` with the values that differ between projects, for example the key of your Linear team.
- **Linear**: the tool that holds the tickets. **Team key**: the letters before the number of a ticket, for example `ABC` in `ABC-12`.
- **`.env`**: a file in the root folder with the values of your machine. Git ignores it. `.env.example` has every variable with an invented sample value.
- **First admin**: the first user of the server. `make setup` creates it from 3 lines of `.env`.
- **Theme**: the colors of the web apps, in a light and a dark version.
- **Worktree**: a second folder of the same repository on its own branch. After this guide, each ticket gets one.


## Step 1. What is already done

The command `npx create-toraline-monorepo` did these things. You do nothing in this step.

- It copied the boilerplate into this folder, and removed the files that belong only to the boilerplate itself.
- It replaced `docs/decisions.md` with an empty list for the decisions of this project.
- It wrote the name of the project into `package.json`, `Makefile`, `AGENTS.md`, `README.md` and `docs/setup-guide.md`, the name of the database into `.env.example`, `docker-compose.yml` and `.github/workflows/check.yml`, and the titles of the two web apps into their messages files.
- It wrote the ticket prefix into the project profile in `AGENTS.md`.
- It removed the sample product of the boilerplate: its code, its tests, its texts and its documents. The login, the users, the Django admin, the 2 languages, the theme, the components of `packages/ui`, the catalog and the checks stay.
- It created `.env` from `.env.example`.
- It wrote the record file `.toraline-monorepo.json`: the version of the boilerplate that this monorepo was created from. The command `npx update-toraline-monorepo` reads it later ([update-a-monorepo.md](update-a-monorepo.md)).
- It made the first commit: `chore: start from the boilerplate <version>`.

It never created a repository on GitHub, a project in Linear or an account.

Run every command of this page from the root folder of your project.

## Step 2. Write 2 sentences about your project

1. Open `README.md`. The line in italics under the title starts with `Write 2 sentences here`. Replace it with 2 sentences: what your project is, and who uses it.
2. Do the same in `AGENTS.md`.
3. Do not change the lines that name `monorepo-boilerplate`. They are in `README.md` (the section "Get a newer core from the boilerplate"), in `docs/setup-guide.md` (section 5), in `scripts/sync-skills.sh` and in `scripts/doctor.sh`. They name the place where your project gets newer skills from, which is the boilerplate.

It worked when: this command prints nothing.

```bash
grep -n "Write 2 sentences here" README.md AGENTS.md
```

## Step 3. Fill the project profile in `AGENTS.md`

1. Open `AGENTS.md` and find the table under "Project profile".
2. Check the value of `ticket_prefix`. It must be the key of your Linear team, for example `ABC`. The create command wrote the value that you gave it.
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

## Step 5. Check `.env`

The file `.env` exists: the create command made it from `.env.example`. Git ignores it.

1. The sample values work on your own machine as they are. Change a value only in these 2 cases:

   | Case | What to change in `.env` |
   |---|---|
   | Another PostgreSQL already runs on port 5432 of your machine, and you did not give the command the flag `--database-port` | The line `POSTGRES_PORT=5432`: write a free port, for example `POSTGRES_PORT=5433`. Without this change, step 6 stops with the line `Port 5432 is already in use by another program` |
   | You want your own email and password for the first admin | The lines `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` and `SEED_ADMIN_NAME` |

Never commit `.env`. Never write a real key or a real password into `.env.example`.

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

   It worked when: the page shows "Logged in as Sample Admin" at the top right (with your name when you changed it), and the title "Start page".

4. Open `http://localhost:3001`, the internal app. It worked when: it shows the menu "Start".
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

## Step 9. Choose the license

The new folder has no file `LICENSE`: the license of the boilerplate is not copied into your project.

1. Decide whether your project gets a license, and which one.
2. When it gets one: add a file `LICENSE` with its text to the root folder, and the line `"license"` with its name to `package.json`, for example `"license": "MIT",`.

A project with no license file is not open source: nobody else may copy its code.

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

   It worked when: the output has the line `1 passed`.

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

## Status

- **Done:** step 1.
- **Not done:** steps 2 to 11. A deploy guide does not exist.
- **What you must do:** steps 2 to 11, in order.

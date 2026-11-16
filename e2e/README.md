# e2e: the end-to-end tests

2 tests that open the web app (`apps/web`) in a real browser and prove that the server, the database and the web app work together.

| Test | File | What it proves |
|---|---|---|
| A user logs in and sees their todo list | `tests/login.spec.ts` | The login page, the login request with its cookie, and the first request for the todos |
| A logged-in user creates a todo and sees it in the list | `tests/create-todo.spec.ts` | The form, the request that saves a todo, and the list after it, also after a reload of the page |

## Context you need before reading

- **End-to-end test**: a test that uses the product the way a person does: it opens a page in a browser, types, presses a button, and reads the page. Nothing is replaced by a fake.
- **Playwright**: the tool that runs the tests. It starts a browser with no window (Chromium) and controls it.
- **Server**: the program in `apps/api`. **Web app**: `apps/web`.
- **`.env`**: the file in the root folder of the repository with the values of your machine. Git ignores it. `.env.example` has every variable with an invented sample value.
- **First admin**: the user that `make seed` creates from the variables `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` and `SEED_ADMIN_NAME` of `.env`.

## Run the tests

Run the command from the root folder of the repository. Docker Desktop must be running.

```bash
make e2e
```

What the command does, in order:

1. It starts the database when it is not running.
2. It downloads the browser of the tests when this machine does not have it. This happens once for each machine: about 190 MB, into the folder of Playwright in your user's cache folder.
3. It deletes the end-to-end database and creates it again, empty. It creates its tables and the first admin.
4. It starts the server on port 8100 and builds and starts `apps/web` on port 3100.
5. It runs the 2 tests.
6. It stops the server and the web app. It stops the database only when step 1 started it.

The command takes about 15 seconds when the browser is already on the machine, and longer the first time.

The tests are not part of `make check`. Run `make e2e` after a change of a page, of a request of the server, or of the login. The automatic check on GitHub runs `make check`, then `make e2e`, on each pull request to `main`.

## The data of the tests

- **Their own database.** The server of the tests uses the database `<POSTGRES_DB>_e2e`: with the sample values it is `todo_e2e`. It is on the same PostgreSQL server as the development database, which has the name `<POSTGRES_DB>`. The tests never open the development database. `e2e/scripts/reset_database.py` refuses every name that does not end with `_e2e`.
- **Empty at each start.** Each run deletes the end-to-end database and creates it again. A test never sees a row of an earlier run.
- **Invented data.** The user of the tests is the first admin: `make e2e` creates it in the end-to-end database from `SEED_ADMIN_*` of `.env`. The tests have no email and no password of their own. On GitHub, `.env` is a copy of `.env.example`: the invented sample values.
- **Their own ports.** The server runs on port 8100 and the web app on port 3100, not on 8000 and 3000. So `make e2e` works while `make run` is running. Other ports: `E2E_API_PORT=8101 E2E_WEB_PORT=3101 make e2e`.

`make e2e` builds `apps/web` with the address of the end-to-end server. The build is in `apps/web/.next`, the folder of `make build-web`. `make run` does not use that build. Before you start the built app yourself with `npm run start --workspace apps/web`, run `make build-web` again.

## When a test fails

`make e2e` ends with an error and prints, for each failed test, what it expected and what the page had. Two folders hold more. Git ignores both.

| Folder | Content |
|---|---|
| `e2e/playwright-report/` | The report of the run. Open it with `npx playwright show-report` inside the folder `e2e` |
| `e2e/test-results/` | For each failed test: a screenshot of the page, and `trace.zip`, a recording of every step. Open a recording with `npx playwright show-trace test-results/<folder>/trace.zip` inside the folder `e2e` |

On GitHub, a failed run keeps both folders for 7 days. Open the page of the run, then **Artifacts**, then download `e2e-report`.

A recording holds what the test typed, also the password of the first admin. Do not share a recording of a machine whose `.env` has a password of your own.

## Add a third test

Example: a test that completes a todo.

1. Create the file `e2e/tests/complete-todo.spec.ts`. The name of a test file ends with `.spec.ts`.
2. Start it with these lines:

   ```ts
   import { expect, test } from "@playwright/test";

   import { logIn } from "./support/login";
   import { messages } from "./support/messages";

   test("a logged-in user completes a todo", async ({ page }) => {
     await logIn(page);
     // The steps of the test.
   });
   ```

3. `logIn(page)` logs the first admin in through the login page. After it the page shows the todo list.
4. The database is empty at the start of a run, and the tests run one after the other in one database. So a test creates the rows it needs, with a title that no other test uses: `` const title = `Invented todo ${Date.now()}`; ``. `tests/create-todo.spec.ts` shows how to create a todo.
5. Find an element the way a person does: by its role and its name, or by its label. Read each text from `messages`, the English texts of `apps/web/src/i18n/messages/en.json`. Do not write a text of the app into a test.

   ```ts
   await page
     .getByRole("button", {
       name: messages.todos.actions.completeName.replace("{title}", title),
     })
     .click();
   ```

6. Check the result with `expect`. Playwright waits until the check is true, up to 5 seconds:

   ```ts
   await expect(
     page.getByRole("listitem").filter({ hasText: title }),
   ).toContainText(messages.todos.completedBadge);
   ```

7. Run `make e2e`. Run it a second time: the test must pass again.
8. Run `make check`. It checks the code style and the types of the test files.

A test for `apps/internal` needs a third program in `webServer` of `e2e/playwright.config.ts`, started the way `apps/web` is. This repository has no such test yet.

## The files

| File | What it is |
|---|---|
| `playwright.config.ts` | The settings of the run: the browser, what is kept for a failed test, and the two programs that Playwright starts and stops (the server and the web app) |
| `environment.ts` | Reads the root `.env`. Gives the ports, the name of the end-to-end database and the first admin |
| `scripts/reset_database.py` | Deletes the end-to-end database and creates it again. Run with the Python of `apps/api/.venv` |
| `tests/*.spec.ts` | The tests |
| `tests/support/login.ts` | `logIn`, the login through the login page |
| `tests/support/messages.ts` | The English texts of `apps/web` |
| `../scripts/e2e.local.sh` | What `make e2e` runs |

## Commands

| Command | What it does |
|---|---|
| `make e2e` | Runs the tests, as described above |
| `make lint-e2e` | Checks the code style with ESLint, then the types with TypeScript. Part of `make lint` and of `make check` |

## Versions

| What | Version |
|---|---|
| `@playwright/test` | 1.65.1 |
| Browser | The Chromium that this version of Playwright downloads |

## Status

- **Done:** the 2 tests, `make e2e`, the end-to-end database, the steps in the automatic check on GitHub with the kept report.
- **Not done:** tests for `apps/internal`; browsers other than Chromium.
- **Not checked:** the steps of `.github/workflows/check.yml` were not run on GitHub when this was written.
- **What you must do:** nothing to set up. `make e2e` installs what is missing.

# apps/internal: the internal app

The app for the admins of the sample product. It has a login page and a logout button, and only an admin gets in: a person without a login is sent to the login page, and a user who is not an admin sees a page that says they have no access. An admin sees a menu with the 3 areas: tags, todos and history. In the area "Tags" an admin creates, renames, recolors and deletes the tags. In the area "Todos" an admin sees the todos of all users in a read-only table, and filters them by owner, by tag and by completed. In the area "History" an admin sees every change of a todo of any user, newest first, and filters the list by user and by kind of change.

## Context you need before reading

- **Next.js**: the framework that the app is written in. It uses React. This app uses the "App Router": each page is a file named `page.tsx` in a folder under `src/app`.
- **Server**: the program in `apps/api`. The pages of this app send their requests to it. It runs on `http://localhost:8000`.
- **Tailwind CSS**: a tool that gives one CSS class for each style, for example `p-4` for a padding.
- **TanStack Query**: the library that sends the requests from a React component and keeps their answers.
- **Zod**: the library that checks that a value has the expected form, for example the body of an answer of the server.
- **Vitest** and **Testing Library**: the tools that run the tests. Testing Library renders a component in a test.
- **ESLint**: the tool that checks the code style.
- **npm workspace**: the list of JavaScript apps and packages in the root `package.json`. One `npm install` in the root folder installs all of them.
- **Component library**: the npm packages `@toraline.tech/ui` (the components, for example `Button`) and `@toraline.tech/tokens` (the colors and the fonts). The app imports a component from `@toraline.tech/ui` directly.
- **`packages/ui`**: the package with the theme of this project and the components that only this project has. Its name in an import is `@repo/ui`. See [packages/ui/README.md](../../packages/ui/README.md).
- **`packages/shared`**: the package with the code that this app and `apps/web` share. Its name in an import is `@repo/shared`. See [packages/shared/README.md](../../packages/shared/README.md).
- **next-intl**: the library that gives a component its texts in the language of the request. The apps have English and Portuguese (Brazil).
- **`.env`**: the file in the root folder of the repository with the values of your machine. Git ignores it.

## Versions

Every version in `package.json` is exact. The same versions are in `apps/web`, `packages/shared` and `packages/ui`.

| What | Version |
|---|---|
| Next.js | 16.4.3 |
| React | 19.2.4 |
| Tailwind CSS | 4.3.0 |
| `@toraline.tech/ui` and `@toraline.tech/tokens` | 0.3.0 |
| TanStack Query | 5.104.5 |
| next-intl | 4.15.1 |
| Zod | 4.6.7 |
| TypeScript | 5.9.3 |
| ESLint | 9.39.4 |
| Vitest | 4.1.12 |

## Commands

Run every command from the root folder of the repository.

| Command | What it does |
|---|---|
| `make install-js` | Installs the packages of the npm workspace into `node_modules` in the root folder |
| `make run-internal` | Starts this app on `http://localhost:3001`. `make internal` is the same command. Ctrl+C stops it |
| `make run` | Starts the database, the server, `apps/web` and this app |
| `make lint-internal` | Checks the code style with ESLint, then the types with TypeScript |
| `make test-internal` | Runs the tests |
| `make build-internal` | Builds the app the way a real server runs it |

Every command except `make install-js` installs the packages first when `node_modules` is missing or older than a `package.json` or `package-lock.json`.

Open the app with `localhost`, not with `127.0.0.1`: `http://localhost:3001`. To the browser the two names are different sites, and it does not send the cookies of the login from one to the other.

To add or update a package: change its line in `apps/internal/package.json`, with an exact version, and run `make install-js`. The lock file is `package-lock.json` in the root folder. This folder has no lock file of its own.

## Folders

```
apps/internal/
├── package.json        the packages and the npm scripts: dev, build, start, lint, typecheck, test
├── next.config.ts      the settings of Next.js; it loads .env of the root folder
├── tsconfig.json       the settings of TypeScript; "@/..." in an import means "src/..."
├── eslint.config.mjs   the rules of ESLint
├── postcss.config.mjs  turns Tailwind CSS on
├── vitest.config.mts   the settings of the tests
├── AGENTS.md           notes for AI agents; `next dev` writes its first block
└── src/
    ├── app/            the pages. layout.tsx wraps every page; login/page.tsx is the login page; (admin)/ holds the pages for admins only: the start page and the areas tags/, todos/ and history/; not-found.tsx is the page for an unknown address; fonts.ts loads the two fonts
    ├── components/     components that several features use: language-switch.tsx, theme-switch.tsx, list-pagination.tsx (the page buttons of a list, with their texts)
    ├── features/       one folder per part of the product: features/auth (the login page, the check that the user is an admin, the "no access" page, the menu, the logout button), features/tags (the table of the tags and its dialogs), features/todos (the table of the todos of all users), features/users (the request that reads the users, for the filters), features/history (the list of the changes)
    ├── i18n/           the languages: request.ts, and messages/en.json and messages/pt-BR.json with every text
    ├── styles/         globals.css: Tailwind CSS, the tokens of the library and the theme of this project
    └── test/           setup.ts: what runs before every test file; render.tsx: renders a component with its texts in a test; navigation.ts: replaces next/navigation in a test
```

One more folder belongs to these conventions:

| Folder | Content |
|---|---|
| `src/lib/` | Code of this app that is not a component and that several features use. Today: `src/lib/format/use-date-time-format.ts`, which writes a date in the format of the chosen language |

A folder under `src/features/` has only the subfolders it needs:

| Subfolder | Content |
|---|---|
| `api/` | The functions that send the requests of the feature, and the Zod schemas of their answers |
| `components/` | The components of the feature |
| `hooks/` | The React hooks of the feature |
| `index.ts` | What the rest of the app may import from the feature |

A test is next to the file it tests, with the same name and `.test.ts` or `.test.tsx`.

Code that `apps/web` also needs, and that is not user interface, goes into `packages/shared`. A component that both apps need goes into `packages/ui`. An app never imports from another app.

## The address of the server

The app reads the address of the server from the variable `NEXT_PUBLIC_API_BASE_URL`. Its line is in `.env` in the root folder; `.env.example` has the local value, `http://localhost:8000`. When the variable is missing, the app uses `http://localhost:8000`.

Next.js looks for env files only in the folder of the app. `next.config.ts` therefore loads `.env` of the root folder itself, so the repository has one file with the values of the machine. This folder has no env file. A variable that the environment already has wins over the same line of `.env`.

The name starts with `NEXT_PUBLIC_` because Next.js gives the code in the browser only the variables with that start. Next.js writes the value into the code when the app starts (`make run-internal`) or is built (`make build-internal`). After a change of the line, start or build the app again. Never put a secret in a variable with that start.

## Requests to the server

Every request goes through one function, `apiFetch`, of `packages/shared`:

```ts
import { apiFetch } from "@repo/shared/api";

const todos = await apiFetch<unknown>("/api/todos/");
const todo = await apiFetch<unknown>("/api/todos/", {
  method: "POST",
  json: { title: "Buy milk" },
});
```

It sends the cookies of the login, gets the CSRF token for a request that changes data, and turns a failed request into one error, `ApiError`. [packages/shared/README.md](../../packages/shared/README.md) has the details. The requests of the server are listed in [apps/api/README.md](../api/README.md).

A feature puts its requests into `src/features/<name>/api/`, checks the answer with a Zod schema, and calls them from a component with TanStack Query. `src/features/tags` is the example: `api/tags.ts` has the requests and the schemas, `hooks/use-tags.ts` the TanStack Query hooks, `components/` the screen. The TanStack Query client is set up once, in `src/app/layout.tsx`.

## Login: admins only

There is no sign-up page and no "forgot my password" page: an admin creates the users and makes a user an admin in the Django admin (see [apps/api/README.md](../api/README.md)).

| Who opens a page | What they get |
|---|---|
| A person without a login | The login page, `/login?next=<the page>`. After the login they get the page they asked for |
| A user who is not an admin | The page "You have no access", with the button "Log out", and no menu and no other page |
| An admin | The menu with the 3 areas ("Tags", "Todos", "History"), the page, and at the top "Logged in as ..." with the button "Log out" |

| What | Where |
|---|---|
| The login page, `/login` | `src/app/login/page.tsx` and `LoginScreen` of `src/features/auth` |
| The check that the user is an admin, and the "no access" page | `src/app/(admin)/layout.tsx`, `RequireAdmin` and `NoAccess` of `src/features/auth` |
| The menu | `AdminMenu` of `src/features/auth`, in `src/app/(admin)/layout.tsx` |
| The logout button of an admin | `UserMenu` of `src/features/auth`, in `src/app/layout.tsx` |
| The requests and the hooks of the login | `@repo/shared/auth` |
| The form | `LoginForm` of `@repo/ui/components` |

A new page for admins goes into the folder `src/app/(admin)/`. The name in brackets is not part of the address: `src/app/(admin)/tags/page.tsx` is the page `/tags`.

The check in the browser only chooses what the page shows. The server checks each request: every address under `/api/admin/` and every change of a tag answers a user who is not an admin with status 403.

## Tags

The page `/tags` is `TagManager` of `src/features/tags`. All users share the tags; only an admin changes them, here or in the Django admin.

| What an admin does | How |
|---|---|
| Sees the tags | A table, ordered by name, with the name, the color (a dot and the value `#RRGGBB`) and the number of todos of all users that use the tag |
| Creates a tag | The button "New tag" opens a dialog with a name and a color. The color is typed in the form `#RRGGBB` or chosen with the color control next to the field |
| Renames or recolors a tag | The button "Edit" of the row opens the same dialog with the values of the tag |
| Deletes a tag | The button "Delete" of the row opens a dialog that says how many todos use the tag ("3 todos use this tag."). The todos stay, without the tag |

A name that another tag has shows the message "A tag with this name already exists." on the name field; upper and lower case count as the same letter, as on the server. The page says when it is loading, when there are no tags and when the server failed.

## Todos of all users

The page `/todos` is `TodoTable` of `src/features/todos`. It reads `GET /api/admin/todos/`.

| What an admin does | How |
|---|---|
| Sees the todos of all users | A table, newest first, 20 rows per page, with the title, the owner (name and email), the tags, "Completed" or "Not completed", and the date and time of the last change |
| Filters them | 3 lists of choices above the table: "Owner", "Tag" and "Completed or not". Several filters work together |
| Moves between the pages | The buttons "Previous page" and "Next page" under the table |

The filters and the page number are kept in the address of the page, for example `/todos?owner=4&tag=2&completed=false&page=2`. A reload, a link and the login return to the same table. A change of a filter goes back to page 1.

The table is read-only: it has no button, no link and no field, and the feature has no request that changes a todo. An admin does not edit the todo of another user here.

The date is written in the format of the chosen language and in the time zone of the browser (`src/lib/format/use-date-time-format.ts`): "Nov 15, 2026, 5:40 PM" in English, "15 de nov. de 2026, 17:40" in Portuguese.

## History of changes

The page `/history` is `HistoryList` of `src/features/history`. It reads `GET /api/admin/history/`.

| What an admin does | How |
|---|---|
| Sees the changes | A table, newest first, 20 rows per page, with the date and time, the user who made the change, the kind of change ("Created", "Edited", "Completed", "Reopened", "Deleted") and the title of the todo |
| Filters them | 2 lists of choices above the table: "User" and "Kind of change". Both work together |
| Moves between the pages | The buttons "Previous page" and "Next page" under the table |

The entry of a deleted todo still shows the title that the todo had: the server keeps the title in the entry. The filters and the page number are kept in the address of the page, for example `/history?user=4&kind=deleted&page=2`. The history is read-only: no request adds, changes or deletes an entry.

The date is written in the format of the chosen language, as in the table of the todos: "Nov 15, 2026, 6:05 PM" in English, "15 de nov. de 2026, 18:05" in Portuguese.

## Languages

Every text of the app exists in English (`src/i18n/messages/en.json`) and in Portuguese of Brazil (`src/i18n/messages/pt-BR.json`). A component never holds a text: it reads it with `useTranslations` of next-intl. ESLint refuses a text written directly in a component, and a test fails when a key is missing in one language.

A first visit gets the language of the browser when it is one of the two, and English otherwise. The language switch at the top of every page changes it; the choice is kept in the cookie `NEXT_LOCALE`. The address of a page is the same in both languages.

How to add a text and how to add a third language: [docs/languages.md](../../docs/languages.md).

## Theme

The components are the ones of the component library: `import { Button } from "@toraline.tech/ui"`. Their colors come from the theme of this project, which is in `packages/ui`. The theme has a light and a dark version. The button next to the language switch changes it; the choice is kept in the cookie `toraline-theme`, and the Next.js server writes it on `<html data-theme>`.

For your own markup, use the classes of the tokens (`bg-surface`, `text-body`, `border-default`), so it follows both themes. `next build` and `next dev` download the two fonts, Inter and Poppins, from Google Fonts the first time; that step needs the internet.

How to change a color, add a component and update the library: [docs/theme.md](../../docs/theme.md).

## Status

- **Done:** the app, its settings, its commands, the login page for admins only with the "no access" page, the menu with the 3 areas, the logout button, the area of the tags (list, create, rename, recolor, delete), the area of the todos of all users (table, 3 filters, pages), the area of the history (table, 2 filters, pages, dates in the format of the language), English and Portuguese (Brazil) with the language switch, the component library with the theme of this project and the theme switch, the tests of all of them.
- **Not done:** nothing that is planned for this app. End-to-end tests are a later milestone.
- **What you must do:** follow [docs/setup-guide.md](../../docs/setup-guide.md), then run `make run` and open `http://localhost:3001`.

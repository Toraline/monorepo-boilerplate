# apps/web: the public web app

The app that a user of this project opens in the browser. It has a login page and a logout button. Every other page needs a login: a person without one is sent to the login page and returns to the page they asked for after the login. The start page shows a title and one sentence: this app has no page of its own yet.

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
- **`packages/shared`**: the package with the code that this app and `apps/internal` share. Its name in an import is `@repo/shared`. See [packages/shared/README.md](../../packages/shared/README.md).
- **next-intl**: the library that gives a component its texts in the language of the request. The apps have English and Portuguese (Brazil).
- **`.env`**: the file in the root folder of the repository with the values of your machine. Git ignores it.

## Versions

Every version in `package.json` is exact. The same versions are in `apps/internal`, `packages/shared` and `packages/ui`.

| What | Version |
|---|---|
| Next.js | 16.4.5 |
| React | 19.2.4 |
| Tailwind CSS | 4.3.0 |
| `@toraline.tech/ui` and `@toraline.tech/tokens` | 0.3.1 |
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
| `make run-web` | Starts this app on `http://localhost:3000`. `make web` is the same command. Ctrl+C stops it |
| `make run` | Starts the database, the server, this app and `apps/internal` |
| `make lint-web` | Checks the code style with ESLint, then the types with TypeScript |
| `make test-web` | Runs the tests |
| `make build-web` | Builds the app the way a real server runs it |

Every command except `make install-js` installs the packages first when `node_modules` is missing or older than a `package.json` or `package-lock.json`.

Open the app with `localhost`, not with `127.0.0.1`: `http://localhost:3000`. To the browser the two names are different sites, and it does not send the cookies of the login from one to the other.

To add or update a package: change its line in `apps/web/package.json`, with an exact version, and run `make install-js`. The lock file is `package-lock.json` in the root folder. This folder has no lock file of its own.

## Folders

```
apps/web/
├── package.json        the packages and the npm scripts: dev, build, start, lint, typecheck, test
├── next.config.ts      the settings of Next.js; it loads .env of the root folder and adds the security headers
├── security-headers.ts the security headers of every answer
├── tsconfig.json       the settings of TypeScript; "@/..." in an import means "src/..."
├── eslint.config.mjs   the rules of ESLint
├── postcss.config.mjs  turns Tailwind CSS on
├── vitest.config.mts   the settings of the tests
├── AGENTS.md           notes for AI agents; `next dev` writes its first block
└── src/
    ├── app/            the pages. layout.tsx wraps every page; login/page.tsx is the login page; (app)/ holds the pages that need a login, and (app)/page.tsx is the start page; not-found.tsx is the page for an unknown address; fonts.ts loads the two fonts
    ├── components/     components that several features use: language-switch.tsx, theme-switch.tsx
    ├── features/       one folder per part of the product: features/auth (the login page, the check of the login, the logout button)
    ├── i18n/           the languages: request.ts, and messages/en.json and messages/pt-BR.json with every text
    ├── styles/         globals.css: Tailwind CSS, the tokens of the library and the theme of this project
    └── test/           setup.ts: what runs before every test file; render.tsx: renders a component with its texts in a test; navigation.ts: replaces next/navigation in a test
```

One more folder belongs to these conventions. Create it with its first file:

| Folder | Content |
|---|---|
| `src/lib/` | Code of this app that is not a component and that several features use, for example `src/lib/format/` |

A folder under `src/features/` has only the subfolders it needs:

| Subfolder | Content |
|---|---|
| `api/` | The functions that send the requests of the feature, and the Zod schemas of their answers |
| `components/` | The components of the feature |
| `hooks/` | The React hooks of the feature |
| `index.ts` | What the rest of the app may import from the feature |

A test is next to the file it tests, with the same name and `.test.ts` or `.test.tsx`.

Code that `apps/internal` also needs, and that is not user interface, goes into `packages/shared`. A component that both apps need goes into `packages/ui`. An app never imports from another app.

## The address of the server

The app reads the address of the server from the variable `NEXT_PUBLIC_API_BASE_URL`. Its line is in `.env` in the root folder; `.env.example` has the local value, `http://localhost:8000`. When the variable is missing, the app uses `http://localhost:8000`.

Next.js looks for env files only in the folder of the app. `next.config.ts` therefore loads `.env` of the root folder itself, so the repository has one file with the values of the machine. This folder has no env file. A variable that the environment already has wins over the same line of `.env`.

The name starts with `NEXT_PUBLIC_` because Next.js gives the code in the browser only the variables with that start. Next.js writes the value into the code when the app starts (`make run-web`) or is built (`make build-web`). After a change of the line, start or build the app again. Never put a secret in a variable with that start.

## Requests to the server

Every request goes through one function, `apiFetch`, of `packages/shared`:

```ts
import { apiFetch } from "@repo/shared/api";

const notes = await apiFetch<unknown>("/api/notes/");
const note = await apiFetch<unknown>("/api/notes/", {
  method: "POST",
  json: { title: "Buy milk" },
});
```

`/api/notes/` is an invented address: write the address of your own request.

It sends the cookies of the login, gets the CSRF token for a request that changes data, and turns a failed request into one error, `ApiError`. [packages/shared/README.md](../../packages/shared/README.md) has the details. The requests of the server are listed in [apps/api/README.md](../api/README.md).

A feature puts its requests into `src/features/<name>/api/`, checks the answer with a Zod schema, and calls them from a component with TanStack Query. For a feature with the name `notes`: `api/notes.ts` has the requests and the schemas, `hooks/use-notes.ts` the TanStack Query hooks, `components/` the screen. The TanStack Query client is set up once, in `src/app/layout.tsx`.

## Login

There is no sign-up page and no "forgot my password" page: an admin creates the users (see [apps/api/README.md](../api/README.md)).

| What | Where |
|---|---|
| The login page, `/login` | `src/app/login/page.tsx` and `LoginScreen` of `src/features/auth` |
| The check that a page needs a login | `src/app/(app)/layout.tsx` and `RequireLogin` of `src/features/auth` |
| The logout button, at the top of every page | `UserMenu` of `src/features/auth`, in `src/app/layout.tsx` |
| The requests and the hooks of the login | `@repo/shared/auth` |
| The form | `LoginForm` of `@repo/ui/components` |

A new page that needs a login goes into the folder `src/app/(app)/`. The name in brackets is not part of the address: `src/app/(app)/settings/page.tsx` is the page `/settings`.

A person without a login who opens `/settings?tab=2` is sent to `/login?next=%2Fsettings%3Ftab%3D2` and gets that page after the login. A wrong email or password shows one message, and the fields keep their values.

The value `next` is used only when it is a path inside the app: it starts with one `/`, and it holds no backslash, no tab, no line break and no other control character. Every other value gives the start page, so a login link cannot send a person to another site (`safeNextPath` of `@repo/shared/auth`).

## The start page

The start page, `/`, is `src/app/(app)/page.tsx`. It shows a title and one sentence. Their texts are in the group `home` of the 2 messages files. Replace the page with the first page of your product.

For a list or a form, `@repo/ui/components` has `Dialog`, `Pagination`, `StateMessage` and `SelectField`. In a dialog the focus stays inside it, the Escape key closes it, and the focus returns to the button that opened it.

## Security headers

`next.config.ts` adds these headers to every answer of the app. The list and the reason for each line are in `security-headers.ts`.

| Header | Value | What it does |
|---|---|---|
| `X-Frame-Options` | `DENY` | No other site can show the app inside a frame |
| `X-Content-Type-Options` | `nosniff` | The browser does not guess the type of a file |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Another site gets the address of the site only, not the page |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=()` | The pages cannot use these features of the device |
| `Content-Security-Policy` | see the file | The pages load code, styles, pictures and fonts only from the app, and send requests only to the app and to the server (`NEXT_PUBLIC_API_BASE_URL`) |

The answers do not have the header `X-Powered-By`.

When a page must load something from another site, for example a picture from a file store, add that site to the right line of `contentSecurityPolicy` in `security-headers.ts`. The browser console names the line that blocked a file.

Two limits:

- The policy allows scripts and styles that are written into the page (`'unsafe-inline'`), because Next.js writes such scripts into each page. A stricter policy needs a new random value (a nonce) for each request. That is not set up here.
- The app does not send `Strict-Transport-Security`. On a real server, the proxy or the host that ends https sends it.

## Languages

Every text of the app exists in English (`src/i18n/messages/en.json`) and in Portuguese of Brazil (`src/i18n/messages/pt-BR.json`). A component never holds a text: it reads it with `useTranslations` of next-intl. ESLint refuses a text written directly in a component, and a test fails when a key is missing in one language.

A first visit gets the language of the browser when it is one of the two, and English otherwise. The language switch at the top of every page changes it; the choice is kept in the cookie `NEXT_LOCALE`. The address of a page is the same in both languages.

How to add a text and how to add a third language: [docs/languages.md](../../docs/languages.md).

## Theme

The components are the ones of the component library: `import { Button } from "@toraline.tech/ui"`. Their colors come from the theme of this project, which is in `packages/ui`. The theme has a light and a dark version. The button next to the language switch changes it; the choice is kept in the cookie `toraline-theme`, and the Next.js server writes it on `<html data-theme>`.

For your own markup, use the classes of the tokens (`bg-surface`, `text-body`, `border-default`), so it follows both themes. `next build` and `next dev` download the two fonts, Inter and Poppins, from Google Fonts the first time; that step needs the internet.

How to change a color, add a component and update the library: [docs/theme.md](../../docs/theme.md).

## Status

- **Done:** the app, its settings, its commands, the login page and the logout button, the start page, English and Portuguese (Brazil) with the language switch, the component library with the theme of this project and the theme switch, the tests of all of them.
- **Not done:** the pages of your own product.
- **What you must do:** follow [docs/setup-guide.md](../../docs/setup-guide.md), then run `make run` and open `http://localhost:3000`.

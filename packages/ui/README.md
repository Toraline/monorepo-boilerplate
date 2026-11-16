# packages/ui: the theme and the components of this project

The user interface code that `apps/web` and `apps/internal` share: the theme of this project, the code that reads the theme a person chose, and the components that only this project has. The name of the package in an import is `@repo/ui`.

The components of the component library are not here. An app imports them from `@toraline.tech/ui` directly.

## Context you need before reading

- **Component library**: the npm packages `@toraline.tech/ui` (the components) and `@toraline.tech/tokens` (the tokens and the function that builds a theme), version `0.3.1`.
- **Token**: a named value of the design, stored as a CSS variable, for example `--bg-primary`.
- **Theme**: one set of values for the tokens. This project has `light` and `dark`.
- **Cookie**: a small value that the browser keeps and sends to the server with every request. The cookie `toraline-theme` holds the chosen theme.
- **npm workspace**: the list of JavaScript apps and packages in the root `package.json`. npm links this folder into `node_modules/@repo/ui`; nothing is published.

[docs/theme.md](../../docs/theme.md) explains the theme and has the steps: change a color, add a component, update the library.

## What is in it

| Import | File | Content |
|---|---|---|
| `@repo/ui/theme` | `src/theme/theme-config.ts`, `resolve-theme.ts` | `themeInputs`, the values of the two themes; `themes`, their names; `defaultTheme`; `nextTheme`; `resolveProjectTheme`, the rule that chooses the theme from the value of the cookie; `THEME_COOKIE_NAME` |
| `@repo/ui/theme/server` | `src/theme/request-theme.ts` | `getRequestTheme`, for code that runs on the Next.js server: it reads the theme cookie. The root layout of each app writes the result on `<html data-theme>` |
| `@repo/ui/theme.css` | `src/theme/theme.css` | The CSS of the theme. Each app imports it in `src/styles/globals.css`. It loads `theme.generated.css` and tells Tailwind CSS to read `src/components` |
| `@repo/ui/components` | `src/components/` | The components that only this project has. Today: `ThemeToggle`, the button that changes the theme; `LoginForm`, the form of the login page of both apps; `StateMessage`, the box that says that a page or a list is loading, is empty or failed; `Dialog`, a dialog for a form or a confirmation, which keeps the focus inside it; `Pagination`, the buttons that move between the pages of a list; `TagBadge`, one tag as a dot in its color and its name; `SelectField`, a list of choices with a label |

The package has no build step. Its files are TypeScript source. Each app names the package in `transpilePackages` of its `next.config.ts`, so Next.js compiles it with the app.

`src/theme/theme.generated.css` is written by a command and committed. Do not change it by hand. A test fails when it is older than `theme-config.ts`.

A component of this package holds no text. The app gives each text as a prop, from its messages files. ESLint refuses a text written in a component here, as in the apps.

## Commands

Run every command from the root folder of the repository.

| Command | What it does |
|---|---|
| `make lint-ui` | Checks the code style with ESLint, then the types with TypeScript |
| `make test-ui` | Runs the tests |
| `npm run theme --workspace packages/ui` | Writes `src/theme/theme.generated.css` from `src/theme/theme-config.ts`. Run it after each change of that file and after each update of the library |

## Status

- **Done:** the theme in a light and a dark version, the rule and the function that read the chosen theme, the theme toggle, the components of the product screens (`LoginForm`, `StateMessage`, `Dialog`, `Pagination`, `TagBadge`, `SelectField`), the tests of all of them, one story file for each component in the catalog (`apps/ui-catalog/stories/project/`).
- **Not done:** the language switch is still one file in each app.
- **What you must do:** nothing. `make install-js` links the package into both apps.

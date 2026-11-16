# apps/ui-catalog: the catalog of the components

A site that shows each user interface component alone, in the theme of this project, light and dark. It shows the components of the component library and the components that only this project has. It also has one page that explains how to change the theme.

The catalog is a tool for the people who write the code. It is never published and never deployed.

## Context you need before reading

- **Storybook**: the tool that the catalog is built with. It shows one component at a time, outside of an app.
- **Story**: one example of a component, for example "the button, disabled". A story is a named export of a file `*.stories.tsx`.
- **Component library**: the npm packages `@toraline.tech/ui` (the components, for example `Button`) and `@toraline.tech/tokens` (the colors and the fonts).
- **`packages/ui`**: the package of this repository with the theme of this project and the components that only this project has. Its name in an import is `@repo/ui`. See [packages/ui/README.md](../../packages/ui/README.md).
- **Theme**: one set of colors. This project has two: `light` and `dark`. See [docs/theme.md](../../docs/theme.md).
- **Vite**: the tool that builds the catalog. The two web apps are built by Next.js; the catalog has no Next.js.

## Versions

Every version in `package.json` is exact. React, Tailwind CSS, TypeScript, ESLint and the component library have the versions of `apps/web`.

| What | Version |
|---|---|
| Storybook (`storybook`, `@storybook/react-vite`, `@storybook/addon-docs`) | 10.6.7 |
| Vite | 8.3.8 |
| `@fontsource/inter`, `@fontsource/poppins` (the font files) | 5.3.0 |

## Commands

Run every command from the root folder of the repository.

| Command | What it does |
|---|---|
| `make catalog` | Starts the catalog on `http://localhost:6006` and opens it in the browser. `make run-ui-catalog` is the same command. Ctrl+C stops it |
| `make lint-ui-catalog` | Checks the code style with ESLint, then the types with TypeScript |
| `make build-ui-catalog` | Builds the catalog into `apps/ui-catalog/storybook-static`. Git ignores that folder. The build fails when a story or a page cannot be built |
| `make check` | Runs the two commands above with the checks of every other app |

The catalog needs no database and no server. `make run` does not start it.

The catalog has no tests of its own. Each component of `packages/ui` has its test next to it, in `packages/ui/src/components/`.

## What the catalog shows

| Group in the sidebar | Entry | What it is |
|---|---|---|
| Theme | Change the theme | A page with the steps to give a new project its own colors, and under them the result |
| Theme | Result | The two examples of that page as stories: a small piece of a screen in the current theme, and a table of every color that this project sets, with its value in each theme. The table reads `packages/ui/src/theme/theme-config.ts` |
| Library | Button, Field, TextInput, Toggle, Tabs, BreadCrumbs, SplitButton | 7 components of `@toraline.tech/ui` in the theme of this project: a page **Docs** with the table of props, and stories for its main states. The other components of version 0.3.0 of the library (27, for example `Select`, `Modal`, `DataTable`) have no story here yet |
| Project | Dialog, LoginForm, Pagination, SelectField, StateMessage, TagBadge, ThemeToggle | Each component of `packages/ui`: a page **Docs** and stories for its states |

The catalog does not repeat the documentation of the library. The page "Change the theme" links to it.

## How to change the theme of the catalog

The toolbar above a story has the control **Theme**. It lists the themes of `packages/ui` (`light`, `dark`). Choose one: every story is shown in that theme.

The control does what an app does: it writes the attribute `data-theme` on `<html>`, and each story is inside `ThemeProvider`. A press on `ThemeToggle` inside a story also changes the control. That press also saves the cookie `toraline-theme` for `localhost`, the cookie of the two web apps: the apps then open in that theme.

## Add a story

Each component of `packages/ui` has one story file. When you add a component to `packages/ui` (the steps are in [docs/theme.md](../../docs/theme.md)), add its story file:

1. Create `apps/ui-catalog/stories/project/<ComponentName>.stories.tsx`. Copy `stories/project/TagBadge.stories.tsx` as a start.
2. Set `title` to `Project/<ComponentName>` and `component` to the component.
3. Give `args` the props that every story of the file shares. A component of `packages/ui` holds no text, so the story gives each text as a prop.
4. Export one story for each state that a person must see, for example `Default`, `Disabled`, `WithError`.
5. Run `make catalog` and look at the stories in both themes.
6. Run `make check`.

For a new component of the library, do the same in `stories/library/`, with the title `Library/<ComponentName>`.

A story may hold a text in English. The rule of the apps "no text in a component" is off in this folder: the catalog has no messages files.

## The files

| File | What it is |
|---|---|
| `.storybook/main.ts` | Which files are stories, which addons are on, and how Vite builds the catalog. An addon is a plugin of Storybook |
| `.storybook/preview.tsx` | What every story gets: the CSS, the control **Theme**, and the decorator that applies the theme. A decorator is a function that wraps every story |
| `.storybook/preview.css` | The CSS of the catalog: the same 4 imports as `src/styles/globals.css` of the apps (Tailwind CSS, the tokens, the theme of `packages/ui`, the components of the library), and the font files |
| `stories/library/*.stories.tsx` | The stories of the components of `@toraline.tech/ui` |
| `stories/project/*.stories.tsx` | The stories of the components of `packages/ui` |
| `stories/theme/` | The page "Change the theme" (`ChangeTheTheme.mdx`), its two stories, and the components they draw |
| `stories/shared/` | Small helpers of the story files |

## How it was checked

Checked on 2026-11-15 with Storybook 10.6.7, in a browser, on `http://localhost:6006`. The values were read with `getComputedStyle` inside the story.

| Story | Theme `light` | Theme `dark` |
|---|---|---|
| **Library / Button / Default** | Background `rgb(109, 40, 217)` (`#6d28d9`), text `rgb(255, 255, 255)`, font Poppins | Background `rgb(196, 181, 253)` (`#c4b5fd`), text `rgb(12, 17, 29)` |
| **Project / TagBadge / Several** | 3 tags, page background `rgb(241, 243, 246)`, tag text `rgb(16, 24, 40)`, font Inter | Page background `rgb(12, 17, 29)`, tag text `rgb(245, 245, 246)` |
| **Project / Dialog / Confirmation** | Not read | The dialog is open, background `rgb(22, 27, 38)` |
| **Project / ThemeToggle / Default** | A press changes the button from "Theme: light" to "Theme: dark" and `data-theme` to `dark` | Not read |
| **Theme / Change the theme** | Not read | 10 rows in the table, 20 color samples, the heading of the sample is `rgb(196, 181, 253)` |

The browser console had no error. Not checked: a browser other than Chromium, a screen reader, and each of the other stories one by one (the build of the catalog compiles all of them).

## Status

- **Done:** the catalog with the theme control, 7 components of the library, the 7 components of `packages/ui`, the page "Change the theme", the build in `make check`.
- **Not done:** tests that run each story in a browser, and an automatic accessibility check of the stories.
- **What you must do:** nothing. `make catalog` installs what is missing and starts the catalog.

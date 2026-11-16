# The theme: the colors of the web apps, light and dark

How the two web apps, `apps/web` and `apps/internal`, get their look: the component library, the theme of this project, and the button that changes between the light theme and the dark theme. How to change a color, how to add a component that only this project has, and how to update the library.

## Context you need before reading

- **Component library**: the npm packages `@toraline.tech/ui` (the components, for example `Button`) and `@toraline.tech/tokens` (the tokens and the function that builds a theme). Both are public on npm. Both apps, the catalog and `packages/ui` use version `0.3.0`.
- **Token**: a named value of the design, stored as a CSS variable. Example: `--bg-primary` is the background of the main action, for example of a primary `Button`.
- **Theme**: one set of values for the tokens. This project has two: `light` and `dark`.
- **`data-theme`**: the attribute on `<html>` that selects the theme: `<html data-theme="dark">`.
- **Cookie**: a small value that the browser keeps and sends to the server with every request. The cookie `toraline-theme` holds the theme a person chose.
- **Tailwind CSS**: a tool that gives one CSS class for each style. Each color token is also a class: `bg-primary`, `text-brand`, `border-default`.
- **`packages/ui`**: the package of this repository with the theme of the project, the theme code that both apps share, and the components that only this project has. Its name in an import is `@repo/ui`. See [packages/ui/README.md](../packages/ui/README.md).

## What the theme is

The library has a default look. Its main color is blue-grey (`#42637c`). This project sets 10 color tokens itself, so its main color is violet: `#6d28d9` in the light theme and `#c4b5fd` in the dark theme. Every token that the project does not change keeps the value of the library.

A first visit gets the light theme. The button at the top right of every page, next to the language buttons, shows the current theme ("Theme: light"). A press changes to the other theme and keeps the choice in the cookie `toraline-theme` for 1 year. For each request the Next.js server reads the cookie and writes `data-theme` on `<html>`, so the page arrives in the right theme. A cookie value that is not `light` or `dark` gives the light theme.

On a local machine the two apps share the cookie, because both are on `localhost`: a theme chosen in one app is also the theme of the other.

## Where things are

| What | Where |
|---|---|
| The values of the theme: the colors of `light` and `dark` | `packages/ui/src/theme/theme-config.ts` |
| The CSS of the theme, written by a command from the file above | `packages/ui/src/theme/theme.generated.css` |
| The CSS file that each app imports (`@repo/ui/theme.css`) | `packages/ui/src/theme/theme.css` |
| The rule that chooses the theme from the cookie value | `packages/ui/src/theme/resolve-theme.ts` |
| The function that reads the cookie on the Next.js server | `packages/ui/src/theme/request-theme.ts` |
| The button that changes the theme | `packages/ui/src/components/theme-toggle.tsx` |
| The texts of that button, in each language | `apps/<app>/src/components/theme-switch.tsx` and the group `themeSwitch` of the messages files |
| The 4 CSS imports of an app | `apps/<app>/src/styles/globals.css` |
| The fonts, and `data-theme` on `<html>` | `apps/<app>/src/app/fonts.ts` and `apps/<app>/src/app/layout.tsx` |

`<app>` is `web` or `internal`.

## Use a component of the library

Import it from the library directly. `packages/ui` does not export the components of the library.

```tsx
import { Button } from "@toraline.tech/ui";
```

The library has `Button`, `Field`, `TextInput`, `Toggle`, `Tabs`, `BreadCrumbs`, `SplitButton` and, since version 0.2.0, 27 more components, for example `Select`, `Textarea`, `Modal`, `StatusBadge` and `DataTable`. A text field with a label is `<Field label="Title"><TextInput name="title" /></Field>`; the component `Input` of version 0.1.0 no longer exists. The full list and the props are in `node_modules/@toraline.tech/ui/README.md`. The components that this project wrote itself are in `packages/ui`: `Dialog`, `SelectField`, `Pagination`, `TagBadge`, `StateMessage` and `LoginForm` (`import { Dialog } from "@repo/ui/components"`). A text of a component comes from the messages files, as every text: [languages.md](languages.md).

For your own markup, use the classes of the tokens, so it follows both themes: `bg-surface`, `text-body`, `border-default`. Do not use a fixed color such as `bg-gray-100`.

## Change a color

Example: make the main color green.

1. Open `packages/ui/src/theme/theme-config.ts`.
2. In the theme `light`, change the values of `bg-primary` and `bg-primary-hover`:

   ```ts
   "bg-primary": "#15803d",
   "bg-primary-hover": "#166534",
   ```

3. In the theme `dark`, change the same two keys. Give every color a value in both themes.
4. Change the other keys that hold the main color: `text-brand`, `border-brand`, `border-focus`, `icon-brand`, `bg-primary-subtle`, `bg-primary-muted`, `bg-selected`.
5. Write the CSS file again. Run this command from the root folder of the repository:

   ```bash
   npm run theme --workspace packages/ui
   ```

6. Run the checks:

   ```bash
   make check
   ```

7. Look at the result. Run `make catalog` and open the page **Theme / Change the theme**: it shows a sample in the current theme and a table of every color that the project sets.

A key of `colors` is the name of a token without the two dashes. The list of the tokens is in `node_modules/@toraline.tech/tokens/README.md`. A key that the library does not have adds a token and its class: `"bg-promo": "#b34700"` adds `--bg-promo` and the class `bg-promo`.

Three tests of `packages/ui` stop a mistake:

| Mistake | What the test says |
|---|---|
| `theme.generated.css` is older than `theme-config.ts` | Run `npm run theme --workspace packages/ui` |
| The text on the main color has a contrast under 4.5 (`text-inverse` on `bg-primary` and on `bg-primary-hover`) | The contrast is too low |
| The brand text (`text-brand`) has a contrast under 4.5 on the page or on a surface | The contrast is too low |

The tests of the main color name its two values. After a change of the main color, write the new values into `packages/ui/src/theme/theme-config.test.ts` and `packages/ui/src/theme/theme-css.test.ts`.

## Add a component that only this project has

1. Create the file in `packages/ui/src/components/`, for example `empty-state.tsx`. Build it from the components of the library and the classes of the tokens.
2. A component of `packages/ui` holds no text. It gets each text as a prop. The app reads the text from its messages files and gives it to the component. `theme-toggle.tsx` and `apps/web/src/components/theme-switch.tsx` are the example.
3. Write `"use client";` in the first line when the component uses a React hook or an event such as `onClick`.
4. Export the component in `packages/ui/src/components/index.ts`.
5. Write its test next to it: `empty-state.test.tsx`.
6. Use it in an app:

   ```tsx
   import { EmptyState } from "@repo/ui/components";
   ```

7. Add its story file to the catalog: `apps/ui-catalog/stories/project/EmptyState.stories.tsx`. The steps are in [apps/ui-catalog/README.md](../apps/ui-catalog/README.md).
8. Run `make check`.

Nothing else is needed. `theme.css` tells Tailwind CSS to read the folder `packages/ui/src/components`, so the classes of the new component get their CSS.

A component that only one app uses stays in that app, in `src/components/` or in a feature folder.

## Update the library

The two packages of the library always have the same version, and the version is the same in 4 files.

1. Open `apps/web/package.json`, `apps/internal/package.json`, `apps/ui-catalog/package.json` and `packages/ui/package.json`.
2. In each file, change the version of both lines to the new version, written exactly, with no `^`:

   ```json
   "@toraline.tech/tokens": "0.3.0",
   "@toraline.tech/ui": "0.3.0",
   ```

3. Install. Run this command from the root folder of the repository:

   ```bash
   make install-js
   ```

4. Write the CSS file of the theme again, because the default values of the library can change with a version:

   ```bash
   npm run theme --workspace packages/ui
   ```

5. Run `make check`. Then run `make catalog` and look at the components of the group **Library** in both themes. Then run `make run`, open both apps, and look at the page in both themes.

The library is at version `0.x`: props and tokens may change between versions. Read the list of changes of the library before an update.

## Status

- **Done:** the library in both apps, the theme of the project in a light and a dark version, the button that changes the theme, the cookie, the tests, the catalog of the components (`apps/ui-catalog`, Storybook).
- **Not done:** nothing.
- **What you must do:** nothing to set up. `make install-js` installs the library from npm.

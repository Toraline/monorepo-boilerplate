# Languages: English and Portuguese (Brazil) in the web apps

How the two web apps, `apps/web` and `apps/internal`, show their texts in two languages, how to add a text, and how to add a third language.

## Context you need before reading

- **Text**: every word that a person reads or hears in an app: a title, a label, a message, the name that a screen reader says for a button.
- **Language code**: the short name of a language. The apps have `en` (English) and `pt-BR` (Portuguese of Brazil).
- **Messages file**: a JSON file with the texts of one language of one app, for example `apps/web/src/i18n/messages/pt-BR.json`.
- **Key**: the name of one text in a messages file, for example `home.title`. A key has the same name in every language.
- **next-intl**: the library that gives a component the text of a key in the language of the request.
- **Cookie**: a small value that the browser keeps and sends to the server with every request. The cookie `NEXT_LOCALE` holds the language a person chose.
- **`Accept-Language`**: the header in which a browser says which languages its user prefers.
- **`packages/shared`**: the package with the code that both apps share. Its name in an import is `@repo/shared`.

## How an app chooses the language

For each request, in this order:

1. The language of the cookie `NEXT_LOCALE`, when a person chose one with the language switch.
2. Otherwise the first language of the header `Accept-Language` that the apps have. `pt`, `pt-BR` and `pt-PT` give `pt-BR`. `en`, `en-US` and `en-GB` give `en`.
3. Otherwise English.

The address of a page is the same in every language. There is no `/en` or `/pt-BR` in it.

The language switch is at the top of every page: one button per language. A click keeps the language in the cookie for 1 year and shows the page again in that language. The attribute `lang` of `<html>` is the chosen language.

On a local machine the two apps share the cookie, because both are on `localhost`: a language chosen in one app is also the language of the other.

## Where things are

| What | Where |
|---|---|
| The list of the languages, their names, the name of the cookie | `packages/shared/src/i18n/config.ts` |
| The rule that chooses the language of a request | `packages/shared/src/i18n/resolve-locale.ts` |
| The function that keeps the chosen language in the cookie | `packages/shared/src/i18n/set-locale.ts` |
| The texts of an app | `apps/<app>/src/i18n/messages/en.json` and `pt-BR.json` |
| The file that gives next-intl the language and the texts of a request | `apps/<app>/src/i18n/request.ts` |
| The language switch | `apps/<app>/src/components/language-switch.tsx` |

`<app>` is `web` or `internal`. Each app has its own texts.

## Add a text

Example: a button "Save" in `apps/web`.

1. Open `apps/web/src/i18n/messages/en.json`. Add the key and the English text. Group the keys by feature or page:

   ```json
   "todos": {
     "save": "Save"
   }
   ```

2. Open `apps/web/src/i18n/messages/pt-BR.json`. Add the same key with the Portuguese text:

   ```json
   "todos": {
     "save": "Salvar"
   }
   ```

3. In the component, read the text with `useTranslations`. Its argument is the name of the group:

   ```tsx
   import { useTranslations } from "next-intl";

   export function SaveButton() {
     const t = useTranslations("todos");
     return <button type="submit">{t("save")}</button>;
   }
   ```

   `useTranslations` works in a Server Component and in a Client Component. In an `async` Server Component, use `const t = await getTranslations("todos")` from `next-intl/server`.

4. A text with a value in it uses braces in the messages file, and the value is the second argument:

   ```json
   "greeting": "Hello, {name}"
   ```

   ```tsx
   t("greeting", { name: user.name })
   ```

5. Run the checks.

   ```bash
   make check
   ```

Three checks stop a mistake:

| Mistake | What stops it |
|---|---|
| A key is in one language and not in the other, or its text is empty | The test `src/i18n/messages.test.ts` of the app (`make test-web`, `make test-internal`) |
| A component uses a key that `en.json` does not have | The type check (`make lint-web`, `make lint-internal`) |
| A text is written directly in a component | ESLint (`make lint-web`, `make lint-internal`) |

ESLint refuses a text between tags (`<p>Save</p>`), a text in braces (`<p>{"Save"}</p>`) and a text in an attribute that a person reads or hears (`alt`, `title`, `placeholder`, `label`, `aria-label`, `aria-description`, `aria-placeholder`, `aria-roledescription`, `aria-valuetext`). The rules are in `eslint.config.mjs` of each app. They do not check test files.

What ESLint does not find: a text in a variable or in a function (`const label = "Save"`), and a text in another attribute. Do not write those. A text that the server returns, for example the field `detail` of an error, is in English only: a page chooses its own translated text from the status of the answer.

In a test, render the component with `renderWithMessages` of `src/test/render.tsx`. Its second argument is the language code; without it the language is English.

## Add a third language

Example: Spanish, with the code `es`.

1. Open `packages/shared/src/i18n/config.ts`. Add the code to `locales` and the name of the language, written in that language, to `localeNames`:

   ```ts
   export const locales = ["en", "pt-BR", "es"] as const;

   export const localeNames: Record<Locale, string> = {
     en: "English",
     "pt-BR": "Português (Brasil)",
     es: "Español",
   };
   ```

2. Copy `apps/web/src/i18n/messages/en.json` to `apps/web/src/i18n/messages/es.json`. Translate every text. Keep the keys.

3. Do the same in `apps/internal/src/i18n/messages/`.

4. Open `src/test/render.tsx` in each app. Import the new file and add it to `messagesByLocale`.

5. Run the checks.

   ```bash
   make check
   ```

Nothing else changes. The language switch shows a third button. A browser that asks for `es`, `es-ES` or `es-MX` gets Spanish on its first visit. The test `src/i18n/messages.test.ts` fails until each app has a file for each language of `locales`, with the same keys.

## Status

- **Done:** English and Portuguese (Brazil) in both apps, also for every text of the product screens, the language switch, the cookie, the choice of the language on a first visit, the three checks. A date is written in the format of the language (`apps/internal/src/lib/format/use-date-time-format.ts`).
- **Not done:** the page that Next.js shows when the app itself fails has no translation; it is the page of Next.js. The names of the tags and the texts of the todos are data that people type: they are not translated.
- **What you must do:** nothing to set up. Follow "Add a text" for each new text.

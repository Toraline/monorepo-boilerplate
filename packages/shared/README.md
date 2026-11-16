# packages/shared: the code that the web apps share

Code that `apps/web` and `apps/internal` both use and that is not user interface: the requests to the server, the setup of TanStack Query and the languages. The name of the package in an import is `@repo/shared`.

## Context you need before reading

- **Server**: the program in `apps/api`. Its requests are listed in [apps/api/README.md](../../apps/api/README.md).
- **Session cookie**: the cookie `sessionid` that the server gives the browser at the login. The browser must send it with each request.
- **CSRF token**: a secret value that the server asks for in each request that changes data. A web app gets it from `GET /api/auth/csrf/` and sends it in the header `X-CSRFToken`.
- **TanStack Query**: the library that sends the requests from a React component and keeps their answers.
- **npm workspace**: the list of JavaScript apps and packages in the root `package.json`. npm links this folder into `node_modules/@repo/shared`; nothing is published.

## What is in it

| Import | File | Content |
|---|---|---|
| `@repo/shared/api` | `src/api/client.ts` | `apiFetch`, the one function that sends a request to the server; `ApiError`, the one error it throws; `pagedSchema` and `listQuery` (`src/api/paged.ts`), for a request that returns one page of a list; `hasFieldError` (`src/api/field-errors.ts`), which says whether the server refused the value of one field |
| `@repo/shared/auth` | `src/auth/` | The login: the requests `fetchCurrentUser` ("who am I"; `null` when nobody is logged in), `login` and `logout`; the hooks `useCurrentUser`, `useLogin` and `useLogout`; `safeNextPath` and `loginPathFor`, the rule for the page that a person gets after the login |
| `@repo/shared/env` | `src/env/client-env.ts` | `getClientEnv`, which reads and checks `NEXT_PUBLIC_API_BASE_URL`, the address of the server |
| `@repo/shared/navigation` | `src/navigation/` | `useAddressValues`, the hook that reads and changes the values after `?` in the address of the page, where a list keeps its filters and its page number; `readPage`, `readId` and `readChoice`, which read one such value |
| `@repo/shared/query` | `src/query/` | `QueryProviders`, the component that gives the pages the TanStack Query client; each app uses it in `src/app/layout.tsx` |
| `@repo/shared/testing` | `src/testing/mock-server.ts` | Only for tests: `mockServer`, which replaces `fetch` with the routes that a test names |
| `@repo/shared/i18n` | `src/i18n/config.ts`, `resolve-locale.ts`, `message-keys.ts` | The list of the languages (`locales`), their names, the name of the cookie; `resolveLocale`, the rule that chooses the language of a request; `messageKeyProblems`, which the test of the messages files of each app uses |
| `@repo/shared/i18n/server` | `src/i18n/request-locale.ts` | `getRequestLocale`, for code that runs on the Next.js server: it reads the cookie and the header `Accept-Language` |
| `@repo/shared/i18n/actions` | `src/i18n/set-locale.ts` | `setLocale`, the function that the form of the language switch calls on the Next.js server: it keeps the chosen language in the cookie |

The package has no build step. Its files are TypeScript source. Each app names the package in `transpilePackages` of its `next.config.ts`, so Next.js compiles it with the app.

The texts of an app are not here: each app has its own messages files. [docs/languages.md](../../docs/languages.md) explains the languages.

User interface (components, the theme) does not belong here. It goes into `packages/ui`; see [packages/ui/README.md](../ui/README.md).

## `apiFetch`

```ts
import { apiFetch, isApiError } from "@repo/shared/api";

// A request that reads.
const tags = await apiFetch<unknown>("/api/tags/");

// A request that changes data. `json` is sent as the JSON body.
try {
  await apiFetch<unknown>("/api/todos/", {
    method: "POST",
    json: { title: "Buy milk" },
  });
} catch (error) {
  if (isApiError(error) && error.status === 400) {
    // error.body is the JSON body of the answer, for example
    // {"title": ["This field is required."]}
  }
}
```

What it does:

1. It builds the address from `NEXT_PUBLIC_API_BASE_URL` and the path.
2. It sends the cookies with every request (`credentials: "include"`), so the server knows the user.
3. For a request that changes data (every method except `GET`, `HEAD` and `OPTIONS`), it first sends `GET /api/auth/csrf/` and puts the token of the answer into the header `X-CSRFToken`. It asks before each such request, because a login changes the token.
4. It returns the JSON body of the answer. For an answer with status `204` it returns `undefined`.
5. When the request fails, it throws one `ApiError`.

The fields of an `ApiError`:

| Field | Content |
|---|---|
| `status` | The HTTP status of the answer, for example `401`. `0` when the server gave no answer; `isNetworkError(error)` is then true |
| `body` | The JSON body of the answer, or `null` when it had none |
| `detail` | The text of the field `detail` of the body, or `null`. The server writes it in English |
| `message` | A technical text in English for logs, for example `GET /api/auth/me/ failed with status 401`. It is not a text for the screen |

A page chooses the text that it shows from `status`, not from `message`.

## Commands

Run every command from the root folder of the repository.

| Command | What it does |
|---|---|
| `make lint-shared` | Checks the code style with ESLint, then the types with TypeScript |
| `make test-shared` | Runs the tests. `fetch` is replaced by a test function; no server is needed |

## Status

- **Done:** `apiFetch` and `ApiError` with their tests, the reading of the address of the server, the TanStack Query setup, the languages and the rule that chooses one, the login (requests, hooks, the rule for the page after the login), the helpers for lists in pages and for the values of the address, the replaced server for tests, with their tests.
- **Not done:** nothing that is planned for this package.
- **What you must do:** nothing. `make install-js` links the package into both apps.

# packages

One folder per package. A package is code that the apps share. Nobody runs a package by itself.

| Folder | What it is | State |
|---|---|---|
| `packages/shared` | Code that `apps/web` and `apps/internal` share and that is not user interface: the requests to the server, the TanStack Query setup, the languages. See [packages/shared/README.md](shared/README.md) | Exists |
| `packages/ui` | The theme of this project, the theme code that both apps share, and the components that only this project has. It does not export the components of the component library. See [packages/ui/README.md](ui/README.md) | Exists |

Rules:

1. Every folder in `packages/` that has a `package.json` is a member of the npm workspace (the root `package.json` has the entry `packages/*`).
2. An app uses a package by its name in the app's `package.json`. npm links the folder; nothing is published.
3. A package never imports code from an app.
4. Each package has the commands `lint-` and `test-` in the root `Makefile`, for example `make lint-shared`. A package needs a `package.json` with the scripts `lint` and `test`.

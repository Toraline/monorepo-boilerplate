<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## This app

- Read [README.md](README.md) before changing this app: the folders, the commands, the address of the server, the requests.
- Run the commands from the root folder of the repository, through `make`: `make lint-web`, `make test-web`, `make build-web`, `make run-web`.
- Never write a text for a person in a component. Add the key to `src/i18n/messages/en.json` and `src/i18n/messages/pt-BR.json` and read it with `useTranslations`. The steps are in [docs/languages.md](../../docs/languages.md).
- The rules of the repository are in [AGENTS.md](../../AGENTS.md) of the root folder.

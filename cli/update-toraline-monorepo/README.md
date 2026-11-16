# update-toraline-monorepo

Finds the updates of the Toraline monorepo boilerplate (`Toraline/monorepo-boilerplate` on GitHub) that a monorepo does not have yet, and applies the ones that a program can apply.

Run it in the root folder of a monorepo that was created with `create-toraline-monorepo`:

```bash
npx update-toraline-monorepo --check   # only list the updates; change nothing
npx update-toraline-monorepo           # choose the updates, apply them on a new branch
```

A run with no question, for an agent or a script:

```bash
npx update-toraline-monorepo --yes --all
```

Every flag: `npx update-toraline-monorepo --help`.

## What you need

- Node 24 or newer, and git.
- Access to the repository `Toraline/monorepo-boilerplate` with your git login.
- The record file `.toraline-monorepo.json` in the root folder. `create-toraline-monorepo` writes it. For an older repository: `npx update-toraline-monorepo --init-record <version>`.

## What it does

1. Reads the record file: the version of the boilerplate that the monorepo was created from, and the updates it already has.
2. Reads the releases of the boilerplate that are newer, and lists their updates by kind.
3. Asks which updates you want: all, none, or one by one.
4. Creates a new branch (or a worktree, when the project protects its main checkout).
5. Applies each update that a program can apply, with one commit per update: the core files, and exact dependency versions. A file that your project changed is never overwritten: the command shows the difference and leaves the update for the plan.
6. Writes every other chosen update into the plan file `local-docs/boilerplate-update/plan.md`.
7. Prints the next step: the skill `/update-boilerplate`, which an AI agent follows to do the rest.

It never pushes, never opens a pull request and never writes to a ticket tool.

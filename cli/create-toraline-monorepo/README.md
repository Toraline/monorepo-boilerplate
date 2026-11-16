# create-toraline-monorepo

Creates a new monorepo from the Toraline monorepo boilerplate (`Toraline/monorepo-boilerplate` on GitHub).

```bash
npx create-toraline-monorepo
```

The command asks 5 questions, one at a time: the folder, the name of the project, the ticket prefix (the key of your Linear team), the name of the database, and whether to keep the sample todo product. Each question has a default.

A run with no question, for an agent or a script:

```bash
npx create-toraline-monorepo my-project --yes --ticket-prefix ABC --remove-sample
```

Every flag: `npx create-toraline-monorepo --help`.

## What you need

- Node 24 or newer, and git.
- The network. The repository `Toraline/monorepo-boilerplate` is public: git reads it with no login. The command downloads the boilerplate with `git`, at its newest release tag. The package itself holds no file of the boilerplate.

## What it does

1. Downloads the boilerplate into the new folder. The folder must not exist, or be empty.
2. Writes the name of the project, the ticket prefix and the name of the database into the files that hold them, and a starting text for a new project at the top of `README.md` and `AGENTS.md`.
3. Removes the sample todo product, when you chose that: its code, its tests, and what the documents say about it.
4. Removes the files that belong only to the boilerplate itself, also its file `LICENSE`: you choose the license of your project.
5. Creates `.env` from `.env.example`, and the record file `.toraline-monorepo.json` with the version of the boilerplate.
6. Starts a new git history with one commit.
7. Prints the next steps.

It never creates a repository on GitHub, a project in Linear or an account. It writes only inside the new folder.

The full guide is `docs/start-a-new-monorepo.md` in the new folder.

## License

MIT. The package holds the file `LICENSE`.

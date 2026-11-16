# Contributing

How to report a bug or propose a change in this repository.

## Context you need before reading

- **This repository**: `Toraline/monorepo-boilerplate`, the starting point that Toraline uses for its own projects. It is public so that other people can use it and read it.
- **Issue**: a public note on GitHub about a bug or an idea.
- **Pull request**: a proposed change to the files, on GitHub.

## What to expect

- One person maintains this repository in their free time. An answer can take days or weeks.
- The boilerplate follows the needs of the projects of Toraline. A change that does not fit them can be declined, also when it is good. This is not a judgment of your work.

## Report a bug

1. Check that no open issue describes it: https://github.com/Toraline/monorepo-boilerplate/issues
2. Open a new issue. Write the command that you ran, what you expected, what happened, and the version (the content of the file `boilerplate/VERSION`).

A vulnerability is not reported in an issue: see [SECURITY.md](SECURITY.md).

## Propose a change

1. For anything larger than a small fix, open an issue first and describe the change. This avoids work on a change that will be declined.
2. Set the repository up on your machine: [docs/setup-guide.md](docs/setup-guide.md).
3. Make the change on a branch of your own copy (fork) of the repository.
4. Run the checks. Both must pass:

   ```bash
   make check
   make e2e
   ```

5. Open a pull request to the branch `main`. Say what changed, why, and how you checked it.

Rules for a change:

- No real key, password, personal data or private name in any file. Sample values start with `sample-`, and emails end with `@example.com`.
- A fix has a test that fails without the fix.
- The documents are in plain English with short sentences: [agent/rules/writing.md](agent/rules/writing.md).
- A technical choice gets an entry at the top of [docs/decisions.md](docs/decisions.md).
- A commit message has the form `type(scope): summary`, for example `fix(api): refuse an empty title`.

## License

This repository has the MIT license ([LICENSE](LICENSE)). By opening a pull request you agree that your change gets the same license.

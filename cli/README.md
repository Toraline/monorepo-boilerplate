# cli: the two npm commands of the boilerplate

The code of the two packages that a person runs with `npx`:

| Package | Folder | What it does |
|---|---|---|
| `create-toraline-monorepo` | `cli/create-toraline-monorepo/` | Creates a new monorepo from the boilerplate |
| `update-toraline-monorepo` | `cli/update-toraline-monorepo/` | Finds the updates of the boilerplate that a monorepo does not have, and applies the ones that a program can apply |

`cli/shared/` holds the code that both commands use. It is not a package: the build puts it into the one file of each command.

## Context you need before reading

- **Boilerplate**: this repository. **Monorepo**: a repository that was created from it.
- **Template**: the files of the boilerplate that a new monorepo gets. They are not inside the packages. A command downloads them with `git`, at a release tag.
- **Source**: the place a command downloads the boilerplate from. The default is `Toraline/monorepo-boilerplate` on GitHub. The flag `--source` or the environment variable `TORALINE_BOILERPLATE_SOURCE` names another place: a folder of this machine, or a git address.

## Commands

Run them from the root folder of the repository.

```bash
make lint-cli    # ESLint and TypeScript
make test-cli    # the tests (Vitest); they use git in temporary folders, and no network
make build-cli   # writes cli/<package>/dist/index.js, then checks the files that each packed package would hold
make check       # runs the three, with the checks of the rest of the repository
```

`cli/` has its own `package.json` and its own `package-lock.json`. It is not a member of the npm workspace of the root folder, so a monorepo that is created from the boilerplate has no trace of it in its lock file.

## Try a command on your machine

```bash
make build-cli
node cli/create-toraline-monorepo/dist/index.js --help
node cli/create-toraline-monorepo/dist/index.js /tmp/my-project --yes --source . --ref <a tag or a branch of this checkout>
```

With `--source .` the command copies what is committed in this checkout, at the tag or the branch of `--ref`. It does not copy a change that is not committed.

## Where things are

| File | Content |
|---|---|
| `boilerplate/create-manifest.json` | What `create-toraline-monorepo` changes in a copy: the files of the boilerplate itself to remove, the lines that hold the name of the project, and the files and lines of the sample product. It is part of the template, so it always fits the files of its own release |
| `boilerplate/without-sample/` | The files that replace a file of the sample product when it is removed |
| `boilerplate/VERSION`, `boilerplate/updates/` | The version and the updates files: [docs/boilerplate-version.md](../docs/boilerplate-version.md) |
| `cli/scripts/build.mjs` | The build (esbuild): one file per command, with no dependency at run time |
| `cli/scripts/check-packed.mjs` | Stops when a package would hold a file other than `README.md`, `package.json` and `dist/index.js`, a personal path or an email address |

## When you change a file that the manifest names

`make test-cli` creates a monorepo from this checkout two times, with and without the sample product. It fails when:

- a line that the manifest replaces is not in its file the expected number of times;
- a file that the manifest deletes does not exist;
- a TypeScript file of the result imports a file that does not exist;
- a file that an overlay of `boilerplate/without-sample/` replaces has changed (the manifest holds its SHA-256).

The message names the file. Correct `boilerplate/create-manifest.json`, then run the test again. This test does not run `make check` inside the result. After a change of the sample product, run the command once for real and run `make setup` and `make check` in the new folder.

## Publishing

A person publishes, through the GitHub workflow "Release": [docs/releasing.md](../docs/releasing.md). An agent never publishes.

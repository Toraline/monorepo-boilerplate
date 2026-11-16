# The version of the boilerplate, its updates files and the record file

Where the version of this boilerplate is written, how a release says what changed, and how a monorepo that was created from the boilerplate records which version it has. The two commands `create-toraline-monorepo` and `update-toraline-monorepo` read these files.

## Context you need before reading

- **Boilerplate**: this repository, `Toraline/monorepo-boilerplate`. It is the public repository: it gets one commit per release. The daily work happens in a private development repository ([releasing.md](releasing.md)).
- **Monorepo**: a repository that was created from the boilerplate with `npx create-toraline-monorepo`.
- **Version**: three numbers with dots, for example `0.1.0`.
- **Release**: one version of the boilerplate that monorepos can be created from. A release is the git tag `v` plus the version, for example `v0.1.0`.
- **Git tag**: a name that points to one commit.
- **Update**: one change of a release that a monorepo can take, for example new core files or a newer version of a dependency. Each update has an id.
- **Core**: the way of working with agents that is the same in every project: the folders `agent/rules`, `agent/skills` and `agent/templates`, and the scripts that `make sync-skills` copies.
- **Record file**: the file `.toraline-monorepo.json` in the root folder of a monorepo.

## The version

1. The file `boilerplate/VERSION` holds the version. It has one line, for example `0.1.0`.
2. A release is the git tag with the same number, in the public repository: `v0.1.0`. The workflow "Publish" of the public repository creates the tag when the pull request of the release is merged ([releasing.md](releasing.md)).
3. The two packages in `cli/` have the same version in their `package.json`.
4. `make check` fails when `boilerplate/VERSION`, the newest updates file and the versions of the two packages do not agree (the test `cli/shared/src/boilerplate.test.ts`).

## The relation to `agent/CORE_VERSION`

The boilerplate has two numbers. They count different things.

| File | What it counts | When it goes up | Who reads it |
|---|---|---|---|
| `agent/CORE_VERSION` | The core only | In each commit that changes a rule, a skill, a template or a core script | `make sync-skills`, which copies the core from a local copy of the boilerplate into another project, and `make doctor` |
| `boilerplate/VERSION` | The whole boilerplate: the core, the sample product, the configuration, the commands | In each release | `create-toraline-monorepo` and `update-toraline-monorepo` |

Each updates file names the core version of its release in the key `coreVersion`. `make check` fails when the newest updates file and `agent/CORE_VERSION` differ. So a commit that raises `agent/CORE_VERSION` also changes the key `coreVersion` of the newest updates file.

A change of the core reaches a monorepo in one of two ways: `make sync-skills` (from a local copy of the boilerplate, at any commit), or an update of the kind "core files" in a release (through `npx update-toraline-monorepo`).

## The updates files

The folder `boilerplate/updates/` holds one file per release. The name of the file is the version: `boilerplate/updates/0.1.0.json`.

```json
{
  "version": "0.2.0",
  "date": "2026-12-01",
  "coreVersion": "0.1.9",
  "updates": [
    {
      "id": "0.2.0-core",
      "title": "The core 0.1.9: a new writing rule",
      "kind": "core-files",
      "appliedBy": "program",
      "files": ["agent/rules/", "agent/CORE_VERSION"],
      "whatToDo": "Copy the files from the boilerplate."
    },
    {
      "id": "0.2.0-next",
      "title": "Next.js 16.4.6, which closes a security hole",
      "kind": "security",
      "appliedBy": "program",
      "files": ["apps/web/package.json", "apps/internal/package.json", "package-lock.json"],
      "whatToDo": "Write the version into the 2 files and run make install-js.",
      "dependencies": [
        { "file": "apps/web/package.json", "name": "next", "from": "16.4.3", "to": "16.4.6" },
        { "file": "apps/internal/package.json", "name": "next", "from": "16.4.3", "to": "16.4.6" }
      ]
    }
  ]
}
```

The keys of the file:

| Key | Meaning |
|---|---|
| `version` | The version of the release. It is the name of the file |
| `date` | The day of the release, as `YYYY-MM-DD` |
| `coreVersion` | The value of `agent/CORE_VERSION` in this release |
| `updates` | The list of the updates. One or more |

The keys of one update:

| Key | Meaning |
|---|---|
| `id` | The name of the update. It starts with the version and a dash, for example `0.2.0-core`. No two updates have the same id |
| `title` | One line for a person. It becomes the title of the commit and of the ticket |
| `kind` | One of the 5 kinds of the next table |
| `appliedBy` | `program`: the command `update-toraline-monorepo` applies the update. `agent`: the command writes it into the plan file, and an agent or a person applies it |
| `files` | The files and folders that the update touches, as paths from the root folder. A folder ends with `/` |
| `whatToDo` | What a person or an agent does to apply the update by hand |
| `dependencies` | Only for an update of exact versions that a program applies. Each entry has `file` (a `package.json`, or a requirements file of Python), `name`, `from` (the version before; optional) and `to` (the version after) |

The 5 kinds:

| `kind` | What it is | Can `appliedBy` be `program`? |
|---|---|---|
| `core-files` | Files of the core (`agent/`, `scripts/`) | Yes. The command copies the paths of `files` from the release |
| `dependency-versions` | Newer exact versions of dependencies | Yes, with `dependencies` |
| `security` | A change that closes a security hole. Most often a version of a dependency | Yes, with `dependencies` |
| `new-feature` | Something new that a project can take | No |
| `manual-change` | A change that needs a decision of the project | No |

The first release, `0.1.0`, has one update, `0.1.0-first-release`. It describes the boilerplate as it is at that release. A monorepo that is created from `0.1.0` already has it.

The updates file of a published release is never edited: monorepos already read it. So `coreVersion` of an older file can differ from `agent/CORE_VERSION` of today. `make check` compares `agent/CORE_VERSION` only with the newest updates file.

### How to add a release

1. Write the new version into `boilerplate/VERSION` and into `version` of `cli/create-toraline-monorepo/package.json` and `cli/update-toraline-monorepo/package.json`.
2. Create `boilerplate/updates/<version>.json` with one update for each thing that a monorepo can take.
3. Run `make check`.
4. Follow [releasing.md](releasing.md).

## The record file of a monorepo

`create-toraline-monorepo` writes `.toraline-monorepo.json` into the root folder of the new monorepo and commits it. `update-toraline-monorepo` reads it, and adds the id of each update that it applies.

```json
{
  "boilerplate": "Toraline/monorepo-boilerplate",
  "createdFromVersion": "0.1.0",
  "createdOn": "2026-11-15",
  "appliedUpdates": [
    "0.1.0-first-release"
  ]
}
```

| Key | Meaning |
|---|---|
| `boilerplate` | The repository that the monorepo was created from |
| `createdFromVersion` | The version of the boilerplate that the monorepo was created from. It never changes |
| `createdOn` | The day the monorepo was created, as `YYYY-MM-DD` |
| `appliedUpdates` | The ids of the updates that the monorepo has, oldest first |

An update is missing in a monorepo when its release is newer than `createdFromVersion` and its id is not in `appliedUpdates`.

A repository that was started from the boilerplate before the record file existed has none. To add one: run `npx update-toraline-monorepo --init-record <version>` in its root folder, with the version of the boilerplate it was started from, and commit the new file.

## Status

- **Done:** the version file, the updates folder with one file per version, the record file, the test that compares them.
- **Done:** the first release, `0.1.0`, on 2026-11-16: both commands are on npm.
- **Done:** the second release, `0.1.1`, on 2026-11-16: both commands are on npm with that version.
- **Done:** the third release, `0.1.2`, on 2026-11-16: both commands are on npm with that version.
- **Not done on 2026-11-16:** the tags `v0.1.0`, `v0.1.1` and `v0.1.2` are not in the public repository yet. They exist in the development repository and in a prepared seed. The owner pushes the seed ([releasing.md](releasing.md), "One-time setup", part A). Until then the published commands cannot download the boilerplate.
- **On 2026-11-16:** `0.1.0`, `0.1.1` and `0.1.2` are published. `0.1.2` is the last released version. `0.1.3` is prepared in the files and not published: `boilerplate/updates/0.1.3.json` holds its 3 updates, and its core version is `0.1.11`. `boilerplate/updates/0.1.2.json` is exactly the file of the release `0.1.2`.
- **Not done:** nothing that is planned for this document. A version that is in `boilerplate/VERSION` and has no tag in the public repository yet is prepared and not published; this prints the released versions: `git ls-remote --tags https://github.com/Toraline/monorepo-boilerplate.git`.
- **What you must do:** nothing for this document. To release: [releasing.md](releasing.md).

# The repositories that use the boilerplate

The list of the repositories that were created from this boilerplate, with the version of the boilerplate that each has. The owner of the boilerplate uses it to know who needs an update after a release.

## Context you need before reading

- **Boilerplate**: this repository, `Toraline/monorepo-boilerplate`.
- **Version**: the value of `createdFromVersion` in the record file `.toraline-monorepo.json` of a repository ([boilerplate-version.md](boilerplate-version.md)).
- **Newest update**: the last id of the list `appliedUpdates` of the same file.

## The list

| Repository | Created from version | Newest update |
|---|---|---|
| (none yet) | | |

No repository is listed today. This repository cannot know of one: no release of the boilerplate exists yet (the first release will be `0.1.0`), so no repository has a record file.

## How to add a repository

1. Open the file `.toraline-monorepo.json` in the root folder of the repository.
2. Add one row to the table above: the name of the repository as `owner/name`, the value of `createdFromVersion`, and the last id of `appliedUpdates`.
3. Remove the row "(none yet)" when you add the first repository.
4. Commit the change through a pull request, as any change of this repository.

Write only these 3 values. Write nothing else about a repository here: no address of a server, no name of a customer, no description of its product. This file is public.

A repository that was started before the record file existed has no `.toraline-monorepo.json`. Create it first: `npx update-toraline-monorepo --init-record <version>` in that repository.

## How to change a row

After a repository merged the pull request of an update (`npx update-toraline-monorepo`, then the skill `/update-boilerplate`), write the new last id of its `appliedUpdates` into the column "Newest update".

## Status

- **Done:** the list and the steps to add a repository.
- **Not done:** no repository is listed.
- **What you must do:** add a row for each repository that you create with `npx create-toraline-monorepo`.

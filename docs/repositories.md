# The repositories that use the boilerplate

This file holds no list. The owner of the boilerplate keeps the list of the repositories that were created from it outside this repository, because this repository is public and some of those repositories are private.

## Context you need before reading

- **Boilerplate**: this repository, `Toraline/monorepo-boilerplate`.
- **Owner**: the person who owns this repository and releases it.
- **Record file**: the file `.toraline-monorepo.json` in the root folder of a repository that was created from the boilerplate ([boilerplate-version.md](boilerplate-version.md)).
- **Version**: the value of `createdFromVersion` in the record file.
- **Newest update**: the last id of the list `appliedUpdates` of the record file.

## Why no list is here

A row of such a list names a repository. The name of a private repository, of a customer or of a product that is not public must not be in a public file. So no name of a repository is written in this file, and none is added later.

## Where the list is

The owner keeps it in a private place, for example a private note or a private Linear document. It is not in this repository, also not in a file that git ignores.

The list has one row per repository, with 3 values:

| Value | Where it comes from |
|---|---|
| The repository, as `owner/name` | The address of the repository on GitHub |
| Created from version | `createdFromVersion` of its record file |
| Newest update | The last id of `appliedUpdates` of its record file |

## How the owner uses the list

1. After a release ([releasing.md](releasing.md)), open the list.
2. In each repository of the list, run `npx update-toraline-monorepo`, then the skill `/update-boilerplate` ([update-a-monorepo.md](update-a-monorepo.md)).
3. After the pull request of the update is merged, write the new last id of `appliedUpdates` into the row of that repository.
4. After `npx create-toraline-monorepo` created a new repository, add its row.

A repository that was started before the record file existed has no `.toraline-monorepo.json`. Create it first: `npx update-toraline-monorepo --init-record <version>` in that repository.

## Your own repository

You created a monorepo from the boilerplate and you are not the owner: you need no list. Your repository has its record file, and `npx update-toraline-monorepo` reads it.

## Status

- **Done:** this file says where the list is and what it holds.
- **Not done:** nothing.
- **What you must do:** the owner keeps the private list up to date. Nobody adds the name of a repository to this file.

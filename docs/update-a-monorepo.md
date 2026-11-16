# Update a monorepo from the boilerplate

How a monorepo that was created from the boilerplate gets what the boilerplate changed later: new rules and skills, newer versions of dependencies, security corrections, new features. One command does the mechanical part. One skill, followed by an AI agent, does the rest and opens the pull request.

## Context you need before reading

- **Boilerplate**: the repository `Toraline/monorepo-boilerplate`. Your monorepo was created from it with `npx create-toraline-monorepo`.
- **Release**: one version of the boilerplate, for example `0.2.0`.
- **Update**: one change of a release that your monorepo can take. Each update has an id, for example `0.2.0-core`, a title, and one of 5 kinds: core files, dependency versions, security, new feature, manual change.
- **Core files**: the way of working with agents: the folder `agent/` and the scripts that come with it.
- **Record file**: `.toraline-monorepo.json` in the root folder of your monorepo. It holds the version of the boilerplate that the monorepo was created from (`createdFromVersion`), the day (`createdOn`), and the ids of the updates the monorepo has (`appliedUpdates`).
- **Plan file**: `local-docs/boilerplate-update/plan.md`. The command writes it. It lists the updates that the command applied and the updates that are left. git ignores it.
- **Skill**: a file of instructions that an AI agent follows. You call one in Claude Code or Cursor by its name with a slash: `/update-boilerplate`.
- **Worktree**: a second folder of the same repository, on its own branch.
- **Project profile**: the table in `AGENTS.md` with the values of your project, for example `base_branch` and `main_checkout`.

## What you need

- Node 24 or newer, and git.
- The network. The boilerplate, `Toraline/monorepo-boilerplate`, is public: git reads it with no login. Check it: `git ls-remote --tags https://github.com/Toraline/monorepo-boilerplate.git` prints one line per release.
- A working tree with nothing uncommitted: `git status` prints `nothing to commit, working tree clean`.

## The steps

1. Open a terminal in the root folder of your monorepo.
2. See which updates exist. This changes nothing:

   ```bash
   npx update-toraline-monorepo --check
   ```

   It prints the updates by kind, each with its id and title. When it prints `Nothing to update.`, stop here.

3. Take the updates:

   ```bash
   npx update-toraline-monorepo
   ```

   It asks: `Which updates do you want? Type "all", "none" or "choose"`. With `choose` it asks yes or no for each update.

   Then it does 4 things:
   1. It creates the branch `boilerplate-update-<newest version>`. When you are in the main checkout and the profile says `main_checkout` is `protected`, it creates a worktree for the branch, in the folder `../<your folder>-boilerplate-update-<newest version>`. It never works on your base branch.
   2. It applies each update that a program can apply, and makes one commit per update: core files, and exact versions of dependencies.
   3. When your project changed a file that an update replaces, it does not overwrite the file. It prints the difference and leaves that update for the plan.
   4. It writes the plan file, and adds the ids of the applied updates to the record file.

   It never pushes, never opens a pull request and never writes to a ticket tool.

4. Open the folder that the command named in its last line in Claude Code or Cursor, and type:

   ```
   /update-boilerplate
   ```

   The agent reads the plan file. It creates one ticket per update (it shows you the list first and asks for one yes). It does each update that is left, with one commit per update. It runs the checks of the project (`make check`). It opens one pull request for all the updates and moves the tickets to the finished status of the profile. It never merges.

5. Review the pull request and merge it.

## One example from start to end

A monorepo `my-project` was created from the boilerplate `0.1.0`. The boilerplate now has the release `0.2.0` with 4 updates. The project changed `scripts/doctor.sh` after it was created. The profile says `main_checkout` is `protected`.

1. The check:

   ```
   $ npx update-toraline-monorepo --check
   This monorepo was created from the boilerplate 0.1.0 and has 1 update.
   The boilerplate has 1 newer release (0.2.0) with 4 updates that this monorepo does not have:

   Core files (the way of working with agents: agent/, scripts/):
     - 0.2.0-writing-rule: The core 0.1.9: writing rule 14 (release 0.2.0; the command applies it)
     - 0.2.0-doctor: The doctor script says its release (release 0.2.0; the command applies it)

   Dependency versions:
     - 0.2.0-testing-library: @testing-library/react 16.3.3 (release 0.2.0; the command applies it)

   Manual changes:
     - 0.2.0-readme: The README names the command that updates the project (release 0.2.0; it goes into the plan for an agent)

   Nothing was changed (--check). To take updates: npx update-toraline-monorepo
   ```

   The exit code is 2, because updates exist.

2. The update, with every update and no question:

   ```
   $ npx update-toraline-monorepo --all
   Created the worktree /work/my-project-boilerplate-update-0.2.0 with the new branch "boilerplate-update-0.2.0".
     Applied: 0.2.0-writing-rule (commit 1f9fee8, 2 files).
     Not applied: 0.2.0-doctor. Your project changed 1 of its files. No file was overwritten.
       The difference between the boilerplate 0.1.0 and your file scripts/doctor.sh:
         +# A change of this project.
     Refreshing package-lock.json with npm (it downloads nothing into node_modules).
     Applied: 0.2.0-testing-library (commit 9d9bbc2, 4 files).

   Applied and committed: 2 updates. Left for the plan: 2 updates.
   The plan file: /work/my-project-boilerplate-update-0.2.0/local-docs/boilerplate-update/plan.md
   Nothing was pushed. No pull request and no ticket was created.
   Next step: open /work/my-project-boilerplate-update-0.2.0 in Claude Code or Cursor and type /update-boilerplate.
   ```

   (The lines of the list and the lines of the difference are shortened here.)

3. The state now:
   - The folder `my-project` is as it was: the branch `main`, no change.
   - The folder `my-project-boilerplate-update-0.2.0` is on the branch `boilerplate-update-0.2.0`, with 2 new commits.
   - `.toraline-monorepo.json` in that folder lists `0.2.0-writing-rule` and `0.2.0-testing-library`. It does not list the 2 updates that are left.
   - The plan file has 2 sections with `Status: open`: `0.2.0-doctor` (reason: the project changed `scripts/doctor.sh`) and `0.2.0-readme` (reason: an agent applies it).

4. In Claude Code, in the folder `my-project-boilerplate-update-0.2.0`, the person types `/update-boilerplate`. The agent:
   1. shows the 5 tickets it will create (1 parent and 4 sub-tickets) and asks for a yes;
   2. merges the new line of the boilerplate into `scripts/doctor.sh` and keeps the line of the project, adds `0.2.0-doctor` to the record file, and commits: `chore(boilerplate): The doctor script says its release (ABC-12)`;
   3. adds the sentence to `README.md`, adds `0.2.0-readme` to the record file, and commits: `chore(boilerplate): The README names the command that updates the project (ABC-13)`;
   4. runs `make check`, which ends with `Check passed.`;
   5. pushes the branch, opens the pull request `chore(boilerplate): update from 0.1.0 to 0.2.0`, and moves the 5 tickets to `Needs QA`.

5. The person reviews the pull request and merges it.

## Run it with no question

For an agent or a script:

```bash
npx update-toraline-monorepo --check                 # exit code 0: no update. 2: updates exist. 1: an error
npx update-toraline-monorepo --all                   # every update
npx update-toraline-monorepo --only 0.2.0-core,0.2.0-next
npx update-toraline-monorepo --none
```

Every flag: `npx update-toraline-monorepo --help`. The flag `--source <folder or git address>` and the environment variable `TORALINE_BOILERPLATE_SOURCE` name another place to get the boilerplate from, for a machine with no network.

## When the command stops

Each message has two lines: `Stopped:` says what is wrong, `What to do:` says the next step.

| Message | What to do |
|---|---|
| `has no record file (.toraline-monorepo.json)` | The repository was started before the record file existed. Run `npx update-toraline-monorepo --init-record <version>` with the version of the boilerplate it was started from, commit the new file, and start again |
| `The working tree has ... not committed` | Commit the changes, or put them away with `git stash --include-untracked` |
| `The boilerplate could not be read` | Check the network: `git ls-remote --tags https://github.com/Toraline/monorepo-boilerplate.git` must print one line per release. With no network, give a local copy of the boilerplate: `--source <folder>` |
| `The branch "boilerplate-update-..." already exists` | An earlier run created it. Finish that update, or give another name with `--branch` |

## What stays in your repository after the command

- The new branch (and its worktree), with the commits of the applied updates.
- The plan file, which git ignores.
- The releases of the boilerplate, as git references with the names `refs/toraline-boilerplate/v<version>`. The command fetches them to read the files of each release. git never pushes them, and no branch holds them. They stay while the plan has an open update, so that the agent can read them. The skill removes them at its end.

## Status

- **Done:** the command and the skill. Both were run once against a throwaway monorepo that was one release behind (see `docs/decisions.md` of the boilerplate).
- **Not done:** the command was not run against the real boilerplate on GitHub. The run above was made before the first release (`0.1.0`, 2026-11-16), with a local copy as the source. In the run, no ticket was created and no pull request was opened.
- **What you must do:** steps 1 to 5 above, after each release of the boilerplate.

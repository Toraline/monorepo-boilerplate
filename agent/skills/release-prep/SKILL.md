---
name: release-prep
description: Analyses a release from a source branch to a target branch and lists its pull requests, conflicts, risks and a checklist. Use when the user says "prepare the release", "what is in this release", "release checklist" or "/release-prep".
disable-model-invocation: true
metadata:
  pack: team
  stage: Team
---

# Release prep

Analyses what a release from one branch to another contains. It leaves one report file with the pull requests, the conflicts, the risks and a checklist. It is read-only: it changes no code, no branch and no pull request.

## Input

A source branch and a target branch: `/release-prep <source> <target>`.

With no input, the skill uses the first pair in the profile's `release_branches`.

## Reads

- Project profile in `AGENTS.md`: `packs`, `release_branches`, `required_reviewers`, `ticket_prefix`, `output_language`.
- `agent/rules/writing.md`, `agent/rules/git-safety.md`, `agent/rules/ask-first.md`.
- `docs/workflow/sources-of-truth.md` for where reports are saved.
- The project's own documentation for where data migrations and feature flags live. If it does not say, ask.
- The table "Products" of the release document (`docs/releasing.md`), when it exists. `agent/skills/release/SKILL.md` says what its columns hold.

## Steps

1. Run `scripts/profile.sh get packs`. If the value does not include `team`, say "The team pack is off for this project." and stop.
2. Run `scripts/profile.sh get release_branches`. If it prints nothing, ask once: "Which source and target branches does a release use here?" Tell the person to add a `release_branches` row to the profile table in `AGENTS.md`. Do the same for `required_reviewers`.
3. Check that the pair `<source> <target>` is one of the pairs in `release_branches`. If it is not, say so and ask whether to continue.
4. Update the remote references without touching the working files: `git fetch origin`.
5. List the commits in the release: `git log --oneline --no-merges origin/<target>..origin/<source>`. If the list is empty, report "Nothing to release." and stop.
6. Find the pull request of each commit: `gh api repos/{owner}/{repo}/commits/<sha>/pulls`. For each pull request collect: number, title, author, merge date, changed files (`gh pr view <number> --json number,title,author,mergedAt,files,reviews,statusCheckRollup`). List commits with no pull request separately. When the table "Products" has more than one product, name the product of each pull request: each product whose cell "Paths" holds one of the changed files, or "no product". This skill does not ask which product is released: the two branches say what the release contains.
7. Match each pull request to a ticket: look for `<PREFIX>-<n>` in the branch name, the title or the body. Read the ticket in Linear for its status. A pull request with no ticket is listed as "no ticket".
8. Check for conflicts without merging: `git merge-tree --write-tree origin/<target> origin/<source>`. For each conflicting file, record the last author on each side (`git log -1 --format='%an %ad' origin/<branch> -- <file>`) and what the two sides change.
9. Give each pull request one risk level by its changed files:
   - **High:** money or billing, sign-in or permissions, data migrations, deletion of data, connections to outside services.
   - **Medium:** code shared by more than one app, feature flags, the contract of an API.
   - **Low:** only screen layout, only tests, only documentation, only configuration of tools.
10. List the new data migrations in the release. For each one: its name, whether it can be reversed, and whether it can lose data.
11. List each feature flag the release adds or reads, and the value it must have on the target.
12. Check approvals: for each pull request, whether the people or teams in `required_reviewers` approved it and whether its checks passed.
13. Save the report (see Output). Print the file path and the summary.

## Output

The file `local-docs/notes/reports/release-prep-<source>-to-<target>-<YYYY-MM-DD>.md`, in the profile's `output_language`, in the shape that `agent/rules/writing.md` requires for a saved document. Sections, in this order:

1. Pull requests in the release: number, title, ticket, author, risk, one note. With more than one product in the table "Products": also the product.
2. Commits with no pull request.
3. Conflicts: file, last author on each side, what conflicts. Or "None".
4. New data migrations.
5. Feature flags and the value each needs on the target.
6. High-risk changes: what changes, what can go wrong, what to verify after the release.
7. Checklist: approvals, checks, conflicts, migrations, feature flags, rollback.
8. Rollback plan: the exact steps to undo the release. Mark each step you did not verify.

Then a fixed report in the chat:

- **Done:** the report path, the number of pull requests, the count per risk level.
- **Not done:** what could not be read (Linear, GitHub, a branch), and why.
- **Next step:** `/release` when the checklist has no open item; with more than one product, `/release <product>` once for each product in the release. Otherwise `/pr-status <number>` for each pull request that blocks.

## Do not

- Do not merge, push, create a branch, create a tag or resolve a conflict.
- Do not post to GitHub, Linear or a chat. See `agent/rules/ask-first.md`.
- Do not switch branches or change files in any checkout. See `agent/rules/git-safety.md`.
- Do not invent a risk, an author or a ticket. Write "not verified" instead.
- Do not hard-code branch names. They come from the input and from `release_branches`.

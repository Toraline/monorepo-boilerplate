---
name: update-boilerplate
description: Executes the plan that the command update-toraline-monorepo wrote - one ticket per update, one commit per update on the branch of the command, the project's checks, then one pull request for all the updates. Use when the user says "update the boilerplate", "apply the boilerplate updates", "execute the update plan" or "/update-boilerplate".
disable-model-invocation: true
metadata:
  pack: core
  stage: Deliver
---

# Update boilerplate

Finishes an update of this project from the boilerplate it was created from. The command `update-toraline-monorepo` does what plain code can do: it finds the updates, applies the mechanical ones on a new branch, and writes a plan file. This skill does the rest: it creates one ticket per update, does each update that the plan left open, runs the project's checks, opens one pull request and updates the record file. It never merges.

## Input

Nothing. Optional: the path of the plan file, when it is not in the default place.

Example: `/update-boilerplate`

## Reads

- Project profile in `AGENTS.md`: `ticket_prefix`, `base_branch`, `commit_format`, `check_command`, `push`, `external_writes`, `finished_status`, `output_language`.
- `agent/rules/writing.md`, `agent/rules/git-safety.md`, `agent/rules/ask-first.md`.
- The plan file, `local-docs/boilerplate-update/plan.md`, in the folder where the command worked. git ignores it.
- The record file, `.toraline-monorepo.json`, in the root folder: the version of the boilerplate that the project was created from, and the list `appliedUpdates` with the ids of the updates the project has.
- The project's own documents for its install command and for what its checks need (for example a running database).

## Steps

1. Read the profile values with `scripts/profile.sh get <key>`.
2. Find the plan file. Look for `local-docs/boilerplate-update/plan.md` in the current folder. When it is not there, run `git worktree list` and look in each worktree whose branch name starts with `boilerplate-update-`. With no plan file:
   1. Run `npx update-toraline-monorepo --check`. It changes nothing.
   2. Exit code 0: report "This project has every update of the boilerplate." and stop.
   3. Exit code 2: show the list that the command printed. Ask one question: "Which updates do you want: all, none, or which ids?" Then run `npx update-toraline-monorepo --all` or `npx update-toraline-monorepo --only <id,id>`. The command creates the branch (or a worktree) and writes the plan file. Continue with step 3.
   4. Exit code 1: show the two lines of the command ("Stopped:" and "What to do:") and stop. When the project has no record file, the second line says how to add one.
3. Go to the folder that holds the plan file. Check 3 things. If one fails, stop and say which.
   - `git branch --show-current` prints the branch of the line "Branch" of the plan, and that branch is not `base_branch`.
   - `git status --porcelain` prints nothing.
   - When the folder is a new worktree, it has what the checks need. Prepare it with the project's own step for a new worktree (for example `make env`), as the project's setup document says.
4. Read the plan. Write down two lists:
   - the updates under "Applied by the command": each has an id, a title and the commit that holds it;
   - the updates under "Left for the agent" whose line "Status" says `open`: each has an id, a title, the reason why the command left it, what to do, and the files to look at.
5. Create the tickets, in the project's ticket tool (Linear, through any tool with `linear` in its name; the team is the one with the key `ticket_prefix`):
   1. Search the ticket tool for a ticket whose title holds the update id. A ticket that exists is used, not created again.
   2. Show the person the list of the tickets to create: one parent ticket "Update from the boilerplate <from version> to <newest version>", and one sub-ticket per update of both lists of step 4, with the title "<title of the update> (boilerplate update <id>)". Ask for one yes for the whole list. Creating tickets is a write to a shared place (`agent/rules/ask-first.md`).
   3. After the yes, create them. The description of a sub-ticket has: what the update is, the reason of the plan, what to do, the files to look at, and for an update that the command applied, its commit. Acceptance criteria: the change is in the project; the project's checks pass; the id is in the record file.
   4. With no access to the ticket tool, or with no yes: do not stop. Write the same texts as drafts into `local-docs/boilerplate-update/tickets.md`, one section per ticket, and say so in the report. From here on, an update with no ticket uses its update id where a step asks for the ticket.
6. Do each open update, in the order of the plan. One update at a time:
   1. Read its section of the plan. See the file of the boilerplate with the command of the line "The file of the boilerplate at this release", and what the boilerplate changed with the command of the line "What the boilerplate changed".
   2. Make the change in the files of the project:
      - **The project changed a file that the update replaces:** merge by hand. Keep the change of the project and add the change of the boilerplate. Never replace the whole file with the file of the boilerplate. When the two changes cannot both stay (they change the same lines for different purposes), ask the person one question that shows both versions, and wait.
      - **A dependency version:** write the exact version into the file, run the project's install command so that the lock file follows, and stage the lock file with the change.
      - **A new feature or a manual change:** follow the line "What to do" of the plan. When it needs a choice that belongs to the project (a name, a color, a text), decide, and write the decision into `docs/decisions.md`.
   3. Run the tests of the files you touched.
   4. Add the id of the update to the list `appliedUpdates` of the record file. Keep the order of the list and the format of the file.
   5. Stage the changed files and the record file by name. Commit with the profile's `commit_format` and the ticket of this update, for example `chore(boilerplate): <title of the update> (<PREFIX>-N)`. One commit per update.
   6. In the plan file, change the line "Status" of the update from `open` to `done (commit <short hash>)`.
   7. When the update cannot be done (a missing input, a check that fails because of it): undo its changes with `git restore` of the files you touched, do not add its id to the record file, set its "Status" to `skipped: <reason>`, and go to the next update.
7. Run the profile's `check_command`. Fix only what an update of this run broke, in a new commit that names the ticket of that update. When it fails for another reason, stop and report the failure. Do not open a pull request with failing checks.
8. Push and open the pull request, as the profile's `push` and `external_writes` say. With `push` set to `ask`, or when `external_writes` does not list the pull request, ask first.
   - One pull request for all the updates, to `base_branch`. Title: `chore(boilerplate): update from <from version> to <newest version>`.
   - Body: one line per update with its id, title, ticket and commit; who applied it (the command or the agent); the updates that were skipped, each with its reason; the result of `check_command`; the decisions that were written into `docs/decisions.md`.
   - Never merge it. Never turn on auto-merge.
9. Tickets after the pull request is open: add the link of the pull request to each ticket of a done update, and move it to the profile's `finished_status`. The ticket of a skipped update stays where it is; add a comment with the reason only after the person's yes. The parent ticket goes to `finished_status` when no update was skipped. With draft tickets, add the link of the pull request to `local-docs/boilerplate-update/tickets.md`.
10. When no update of the plan is `open` or `skipped`, remove the releases that the command fetched. They are git references of this repository; no branch holds them:

    ```bash
    git for-each-ref --format='%(refname)' refs/toraline-boilerplate | xargs -n 1 git update-ref -d
    ```

    Keep them when an update was skipped: the next run reads them. Leave the plan file where it is.

## Output

A fixed report, in the profile's `output_language`:

- **Done:** the branch and its folder; one line per update with its id, ticket, commit and who applied it; the result of `check_command`; the link of the pull request; the status that the tickets now have; the path of the plan file.
- **Not done:** each skipped update with its reason; the tickets that exist only as drafts, with the path of `tickets.md`; what was not verified.
- **Next step:** the person reviews and merges the pull request. After the merge, the worktree of the branch is removed as `agent/rules/git-safety.md` says. For a skipped update: give the missing input, then run `/update-boilerplate` again.

When the output leads to a message (the ticket texts with no access, a comment on a ticket), add a "Draft message" section with the exact text.

## Do not

- Do not merge the pull request, and do not publish or release anything.
- Do not work on `base_branch` or in a protected main checkout. The command created the branch; use it.
- Do not overwrite a file that the project changed with the file of the boilerplate. Merge it.
- Do not add an update to the record file before its change is committed, and never add a skipped update.
- Do not rewrite or squash the commits that the command made.
- Do not create a ticket twice, and do not invent a ticket id. With no ticket, use the update id.
- Do not use `git add -A` or `git add .`. Do not skip the checks before a commit unless the profile's `allow_no_verify` is `yes`.
- Do not write a key, a token or a password into any file, ticket or pull request.
- Do not change code that no update of the plan names.

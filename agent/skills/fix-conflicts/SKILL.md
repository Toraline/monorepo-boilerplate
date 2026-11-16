---
name: fix-conflicts
description: Resolves the merge conflicts of a pull request in its worktree and writes what it chose for each conflict, for the person to confirm. Use when the user says "fix the conflicts on this pull request", "my PR has conflicts" or "/fix-conflicts".
disable-model-invocation: true
metadata:
  pack: team
  stage: Team
---

# Fix the conflicts of a pull request

Merges the base branch into the pull request's branch inside the ticket's worktree and resolves each conflict. It leaves `conflicts-v<N>.md` in the ticket's notes folder: one block per conflict, with both sides, the owner of each side, the choice and the risk.

## Input

A pull request URL or number, or a ticket id.

Example: `/fix-conflicts <PREFIX>-123`

## Reads

- Project profile in `AGENTS.md`: `packs`, `ticket_prefix`, `base_branch`, `worktree_path`, `main_checkout`, `push`, `allow_no_verify`, `commit_format`, `check_command`, `output_language`, `external_writes`, `release_branches`.
- `agent/rules/writing.md`, `agent/rules/git-safety.md`, `agent/rules/ask-first.md`.
- The ticket in Linear, and the ticket of the other side of each conflict when the commit names one.
- The ticket's notes folder: `local-docs/notes/<feature>/<TICKET-ID>/`, or `local-docs/notes/<TICKET-ID>/`.

## Steps

1. Run `scripts/profile.sh get packs`. If the value does not include `team`, say "The team pack is off for this project." and stop.
2. Find the pull request. If none was given, ask: "Which pull request?" Then: `gh pr view <number> --json number,title,url,author,headRefName,baseRefName,mergeable,mergeStateStatus,files`. If `mergeable` is not `CONFLICTING`, say that there are no conflicts and stop.
3. If the pull request was written by another person, ask: "This pull request belongs to <author>. Resolve its conflicts anyway?" Wait for the yes.
4. Get the worktree of the head branch. Run `make worktree-list`. If a worktree is on that branch, use it. If not, build the path from the profile's `worktree_path` and run `git fetch origin <head>` and `git worktree add <path> <head>` from the main checkout. If the worktree has uncommitted changes, stop and report.
5. In the worktree, check `git rev-parse --show-toplevel` (it must not be the main checkout). Then run `git fetch origin <base>` and `git merge origin/<base>`. Never rebase. List the conflicted files: `git status --short` (lines that start with `UU`, `AA`, `DU`, `UD`).
6. For each conflicted file, read the whole file and both sides of every conflict. Find the owner of each side:
   - `git log --format="%h %an %s" origin/<base>..HEAD -- <file>`
   - `git log --format="%h %an %s" HEAD..origin/<base> -- <file>`
   Write `conflicts-v<N>.md` in the notes folder before changing any file, in the profile's `output_language`. `<N>` is the next free number. Per conflict:
   - File and kind of conflict (both changed, both added, deleted on one side).
   - This branch's side: author, ticket, what the change does.
   - The base branch's side: author, ticket, what the change does.
   - Planned resolution and the reason.
   - Risk: none, low, medium or high, and what could break.
7. Show a table `# | File | Resolution | Owners | Risk` and ask one question: "Is this plan right?" Wait for the yes. Change the plan if the person corrects it.
8. Resolve each conflict with these rules:
   - Both sides added separate code: keep both.
   - Both sides changed the same line: read both tickets to learn the intent. If one side is a fix the other must not lose, keep the fix. If the intent of the two sides contradicts, escalate.
   - One side renamed or moved code: take the rename and update the references of the other side.
   - Generated files and lock files: do not merge by hand. Take the base branch's version and generate them again with the project's command.
   - A pull request that merges one branch of `release_branches` into another: the source branch carries a fix; keep the source side.
   - Escalate, do not choose, when: the intent contradicts; the code handles money, permissions or personal data; you do not understand one side. To escalate: leave that file unresolved, write the two options in the file from step 6, and ask the person one question.
9. Check that no marker is left: `git diff --check`, and search the resolved files for `<<<<<<<`, `=======` and `>>>>>>>`.
10. Run the profile's `check_command`. For each failure decide:
    - Caused by a resolution: fix it with the smallest change.
    - It also fails on the base branch: do not fix it; write it under "Not caused by this merge".
    - A type or test error in another person's code that merged without conflict: do not fix it; write it for its owner.
11. Stage the resolved files by name and commit the merge. The message follows `commit_format`. Use `--no-verify` only if `allow_no_verify` is `yes`.
12. Push according to the profile's `push`: `push` means push and report; `ask` means ask first. Never force-push.
13. Update `conflicts-v<N>.md`: per conflict, what was done (if it differs from the plan, why); the fixes of step 10; what still fails and who owns it; the commit hash; then the status block. The person confirms each resolution by reading this file.
14. If this run created the worktree and the commit is pushed: `make worktree-remove TICKET=<n>`. Otherwise keep it and print its path.

## Output

A fixed report:

- **Done:** `conflicts-v<N>.md` with its path, the number of conflicts resolved, the merge commit hash, and whether it was pushed.
- **Not done:** conflicts that were escalated, checks that still fail and their owner, and anything not verified.
- **Next step:** the person reads `conflicts-v<N>.md` and confirms. Then `/pr-status` for the same pull request.

## Do not

- Do not change code before the person says yes to the plan.
- Do not rebase, force-push or amend. Do not merge the pull request.
- Do not refactor, rename or improve code around a conflict.
- Do not pick a side when the rules say to escalate.
- Do not run git changes on the main checkout when `main_checkout` is `protected`.
- Do not post a comment on the pull request or the ticket.

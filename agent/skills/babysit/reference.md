# Babysit: layouts and the subagent brief

Used by `agent/skills/babysit/SKILL.md`. All files are written in the profile's `output_language` and follow `agent/rules/writing.md`.

## Worktree of an existing branch

`make worktree TICKET=<n> SLUG=<slug>` creates a new branch, so it is used only for a ticket with no branch yet. For a pull request that already has a branch:

1. Run `make worktree-list`. If a worktree is on the pull request's head branch, use it.
2. Otherwise build the path from the profile's `worktree_path` (replace `<repo>`, `<prefix>`, `<n>`), then run from the main checkout:
   - `git fetch origin <head-branch>`
   - `git worktree add <path> <head-branch>`
   These 2 commands do not change the branch or the files of the main checkout.
3. Remove it later only with `make worktree-remove TICKET=<n>`.

## Layout of `fix-spec-v<N>.md`

1. Title: `Fix spec v<N>: <TICKET-ID>: <pull request title>`
2. Header lines: pull request URL, head branch, base branch, type (`fix` or `fix-with-conflicts`), status before, date.
3. Context you need before reading.
4. What the ticket asks for, in 2 or 3 sentences (from Linear).
5. Checklist, numbered. One item per thing to fix:
   - Comment: source, author, file and line, link, what a person sees, what must change, the exact fix.
   - CI: the check name, the first error from the log, the likely cause, the fix.
   - Conflict: the files. The resolution rules are in `agent/skills/fix-conflicts/SKILL.md`.
6. Not in the checklist: comments marked already fixed or not valid, each with its reason and a "Draft message" for the reply.
7. Needs your decision: comments that cannot be fixed without an answer from the person.
8. Earlier attempts: what `fix-v*.md` says was tried, what worked, what failed. Do not repeat what failed.
9. Limits: files and behaviour that must not change.
10. Status block: Done / Not done / What you must do.

## Brief for the fix subagent

Fill in every `<...>` and send the whole text.

```
You fix pull request <url> for ticket <TICKET-ID>.

First action, before anything else:
  Run: git rev-parse --show-toplevel
  The answer must be: <worktree path>
  If it is the main checkout or any other folder, stop and report. Run nothing else.

Read these files by path before you change anything:
  agent/rules/git-safety.md
  agent/rules/ask-first.md
  agent/rules/writing.md
  AGENTS.md (the project profile and the coding rules it links to)
  <path of the review rules file>
  <path of fix-spec-v<N>.md>
  <path of pr-status.md>
  <paths of earlier fix-v*.md files, or "none">

Work only in this worktree. The branch is <head-branch>; it is already checked out.

Do each checklist item of the fix spec, in order. Make the smallest change that
solves the item. Change nothing the spec does not name.

<Only for fix-with-conflicts:>
  Run: git fetch origin <base-branch>, then git merge origin/<base-branch>.
  Never rebase. Resolve with the rules in agent/skills/fix-conflicts/SKILL.md,
  step 8. Stop and report any conflict that those rules say to escalate.

Checks: run <check_command>. Report each check as passed, failed, or not run,
with the exact command. Do not commit while a check fails because of your change.

Git:
  <normal mode:> Stage files by name. One commit, message in the format
  <commit_format>. Use --no-verify only if the profile allows it: <allow_no_verify>.
  Push mode from the profile: <push>. With "push": push to the pull request's
  branch after the checks pass. With "ask": do not push; report.
  <--no-commit mode:> Do not stage, commit or push. Leave every change unstaged.
  Never: post, reply to or resolve a comment; merge; rebase; force-push; amend.

Report at the end:
  1. Files changed, one line each.
  2. Commits (hash and message), and whether they were pushed.
  3. Each checklist item: done, or skipped with the reason.
  4. Each check: passed, failed or not run.
  5. Risks, and what a person must verify by hand.
  6. Questions you could not answer from the code.
```

## Layout of `fix-v<N>.md`

1. Title: `Fix v<N>: <TICKET-ID>: <short description>`
2. Header lines: pull request URL, branch, date, spec file, status before.
3. Context you need before reading.
4. What the problem was.
5. Checklist: each item of the spec, done or not done, with what was done or why not.
6. Changes: per change, the file, what changed, why it solves the item, the risk.
7. Conflicts resolved (only if any): a link to `conflicts-v<N>.md`.
8. Commits: hash, message, pushed or not.
9. Decisions: what was chosen and what was rejected, with the reason.
10. Checks: each command with passed, failed or not run.
11. Draft messages: the reply for each comment, not posted.
12. Status block: Done / Not done / What you must do.

---
name: babysit
description: For all your open pull requests, runs 3 phases - status of each, what to fix, fix in each ticket's worktree - with flags to stop after a phase. Use when the user says "babysit my pull requests", "check and fix all my PRs" or "/babysit".
disable-model-invocation: true
metadata:
  pack: team
  stage: Team
---

# Babysit your open pull requests

Checks every open pull request you wrote, writes what must be fixed, and fixes it in each ticket's worktree. It leaves a status file, a fix spec and a fix report per ticket, and one summary file. It never posts and never merges.

## Input

No argument is needed. Flags:

- `--status-only`: stop after phase 1.
- `--skip-fix`: stop after phase 2.
- `--ticket <PREFIX>-<n>`: only the pull request of that ticket.
- `--no-commit`: fix, but do not stage, commit or push. The worktrees stay.

Example: `/babysit --skip-fix`

## Reads

- Project profile in `AGENTS.md`: `packs`, `ticket_prefix`, `base_branch`, `worktree_path`, `main_checkout`, `push`, `allow_no_verify`, `commit_format`, `check_command`, `output_language`, `external_writes`, `review_rules`, `required_reviewers`.
- `agent/rules/writing.md`, `agent/rules/git-safety.md`, `agent/rules/ask-first.md`.
- `agent/skills/pr-status/SKILL.md` and its `reference.md`: the method of phase 1.
- `reference.md` in this folder: the fix spec layout, the subagent brief, the fix report layout.
- Each ticket's notes folder: `local-docs/notes/<feature>/<TICKET-ID>/`, or `local-docs/notes/<TICKET-ID>/`.

## Steps

1. Run `scripts/profile.sh get packs`. If the value does not include `team`, say "The team pack is off for this project." and stop.
2. List the pull requests: `gh pr list --author @me --state open --json number,title,url,headRefName,baseRefName --limit 50`. With `--ticket`, keep only the one whose branch or title names that ticket. Show the list. If it is empty, say so and stop.

### Phase 1: status

3. For each pull request, one after the other, follow steps 3 to 14 of `agent/skills/pr-status/SKILL.md`. Each ticket gets its `pr-status.md`. This phase reads only.
4. Show a table: `Ticket | Pull request | Status | Main problem | Changed since last check`.
5. With `--status-only`, stop here. If every pull request is "ready to merge" or "waiting CI", say that nothing needs a fix and stop.

### Phase 2: what to fix

6. For each pull request with the status "needs fix" or "approved but needs fix":
   1. Read its `pr-status.md`, every `fix-v<N>.md` already in the notes folder, and the ticket in Linear (through a tool with `linear` in its name; without access, ask).
   2. The version `<N>` is the number of `fix-v*.md` files plus 1. If `fix-spec-v<N>.md` exists and lists the same open items as the status file, keep it and skip this ticket.
   3. Check each open comment against the current code (`git show origin/<head>:<path>`). Mark it: confirmed, already fixed, not valid (with the reason), or needs the person's decision.
   4. Write `fix-spec-v<N>.md` with the layout in `reference.md`. Type: `fix` or `fix-with-conflicts`.
7. Show a table: `Ticket | Type | Items to fix | Items that need your decision | Spec file`.
8. With `--skip-fix`, stop here.

### Phase 3: fix

9. Ask one question: "Fix these <N> pull requests, each in its own worktree?" Wait for the yes. Remove from the list any ticket the person names.
10. Run `make worktree-list`. For each ticket, prepare its worktree as `reference.md` says ("Worktree of an existing branch"). If a worktree of that ticket already exists and has uncommitted changes, skip the ticket and report it.
11. Start one subagent per ticket, all at the same time. Each subagent works only in the worktree of its ticket. Give each one the brief in `reference.md`, filled in. The brief tells the subagent to read `agent/rules/git-safety.md`, `agent/rules/ask-first.md` and `agent/rules/writing.md` by path, and to check that it is not in the main checkout before anything else.
12. When a subagent ends, compare its result with the checklist of the fix spec:
    - Every item is done or has a reason: accept.
    - It asked a question: search the code base for the answer and send it. If the answer is not in the code or the ticket, ask the person.
    - It did something the spec does not ask for: ask the person before accepting.
    - At most 3 rounds per ticket. After that, mark the ticket "needs your attention".
13. For each ticket write `fix-v<N>.md` with the layout in `reference.md`. If conflicts were resolved, also write `conflicts-v<N>.md` with one block per conflict (see `agent/skills/fix-conflicts/SKILL.md`, step 6).
14. Push according to the profile's `push`: `push` means the subagent pushed after the checks passed; `ask` means ask the person now, one ticket at a time. With `--no-commit`, nothing is staged, committed or pushed.
15. Remove with `make worktree-remove TICKET=<n>` only the worktrees that this run created and whose commits are pushed. Keep the others and print their paths.
16. Write the summary `local-docs/notes/babysit-<YYYY-MM-DD>.md`, in the profile's `output_language`: counts per phase, a table `Ticket | Pull request | Status before | Action | Result | Files`, the conflict files waiting for the person to confirm, the tickets that need attention, and the draft replies that were not posted.

## Output

A fixed report:

- **Done:** per ticket: `pr-status.md`, `fix-spec-v<N>.md`, `fix-v<N>.md`, the commits pushed (hash, message, pull request), and the path of the summary file.
- **Not done:** tickets skipped or failed, with the reason; checks left to CI; worktrees that stay, with their paths. No comment was posted and nothing was merged.
- **Next step:** `/pr-status` for one ticket after CI ends. To post the draft replies: `/validate-comments`. For resolved conflicts: read `conflicts-v<N>.md` and confirm.

## Do not

- Do not edit files outside a ticket's worktree and `local-docs/`. Do not run git changes on the main checkout when `main_checkout` is `protected`.
- Do not post, reply to or resolve a comment. Do not request a review.
- Do not merge, rebase or force-push. Do not use `--no-verify` unless `allow_no_verify` is `yes`.
- Do not fix an item marked "not valid" or "needs the person's decision".
- Do not let two subagents share a worktree.
- Do not start phase 3 without the person's yes.

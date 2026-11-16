---
name: board-status
description: Shows the current cycle in Linear plus the state of every open pull request of yours, grouped by state. Use when the user says "board status", "where is everything", "what is the state of my pull requests" or "/board-status".
disable-model-invocation: true
metadata:
  pack: team
  stage: Team
---

# Board status

Joins your tickets in the current Linear cycle with your open pull requests and puts each one in exactly one group. It leaves one board file. It is read-only: it changes no code and posts nothing.

## Input

Nothing: `/board-status`.

Optional: `--skip-pr-check` reads only the basic state of each pull request (step 4) and skips the detailed checks (step 5).

## Reads

- Project profile in `AGENTS.md`: `packs`, `ticket_prefix`, `required_reviewers`, `output_language`.
- `agent/rules/writing.md`, `agent/rules/ask-first.md`.
- `docs/workflow/status-skills.md` for which skill fits each state.
- The newest earlier board in `local-docs/notes/cycles/<cycle>/`, to say what changed.

## Steps

1. Run `scripts/profile.sh get packs`. If the value does not include `team`, say "The team pack is off for this project." and stop.
2. Run `scripts/profile.sh get required_reviewers`. If it prints nothing, ask once: "Which people or teams must approve a pull request here?" Tell the person to add a `required_reviewers` row to the profile table in `AGENTS.md`.
3. Read the current cycle in Linear and the tickets in it assigned to the person. For each ticket collect: id, title, status, priority, labels. Without Linear access, ask the person; never invent tickets.
4. Read the open pull requests: `gh pr list --author @me --state open --json number,title,url,headRefName,isDraft,reviewDecision,mergeable,statusCheckRollup,updatedAt`.
5. For each pull request, unless `--skip-pr-check` was given, read (the exact commands are in `agent/skills/pr-status/reference.md`):
   - review threads that are not resolved (`gh api graphql`, field `reviewThreads`);
   - review bodies and timeline comments from people, newer than the last commit;
   - which of the `required_reviewers` approved, and whether the approval is older than the last commit.
6. Match each pull request to a ticket: look for `<PREFIX>-<n>` in the branch name, then in the title. No match: "pull request with no ticket". A ticket with no open pull request: "ticket with no pull request".
7. Put each ticket and pull request pair in exactly one group. Use the first group that fits, in this order:
   1. **Checks running:** at least one check has not finished.
   2. **Approved, needs a fix:** a required reviewer approved, and there is a failed check, an open comment or a conflict.
   3. **Needs a fix:** not approved, and there is a failed check, an open comment, a conflict or a "changes requested" review.
   4. **Ready to merge:** approved by the required reviewers, checks passed, no conflict, no open comment.
   5. **Needs review:** no problem found; only the approval is missing. Say who must review and whether it is a first review or a new review after changes.
   6. **In progress, no pull request:** the ticket's status means work started.
   7. **Not started:** every other ticket in the cycle.
   A pull request with a problem never goes in "Needs review".
8. Compare with the newest earlier board, if there is one: list the items that changed group.
9. Write up to 5 next actions, most useful first. Each one names the ticket and the skill from `docs/workflow/status-skills.md`.
10. Save the board (see Output). Print the file path and the summary.

## Output

The file `local-docs/notes/cycles/<cycle>/board-<YYYY-MM-DD-HHmm>.md`, in the profile's `output_language`, in the shape that `agent/rules/writing.md` requires for a saved document. Date and time use the person's local time zone, and the file names the zone. Sections, in this order:

1. Cycle name and dates.
2. One table per group from step 7. Columns: ticket, pull request, title, and for the fix groups the kind of fix (comment, check, conflict) with one detail.
3. Pull requests with no ticket.
4. Changed since the last board.
5. Summary: tickets in the cycle, pull requests ready to merge, pull requests that need a fix, tickets with no pull request.
6. Next actions.

Then a fixed report in the chat:

- **Done:** the board path and the count per group.
- **Not done:** what could not be read (Linear, a pull request), and why.
- **Next step:** the first next action. Usually `/pr-status <number>` for one pull request, `/babysit` for all that need a fix, or `/standup` for the report to the team.

## Do not

- Do not merge, approve, push, comment or change a ticket's status. See `agent/rules/ask-first.md`.
- Do not switch branches or change files.
- Do not count a comment as resolved because it is old. Read the thread.
- Do not hard-code a time zone, a reviewer or a status name. Match Linear statuses by meaning.

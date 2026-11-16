---
name: standup
description: Writes a standup report with what merged, what is in review, what is blocked and what is next. Use when the user says "standup", "write my standup", "what do I say in the daily meeting" or "/standup".
disable-model-invocation: true
metadata:
  pack: team
  stage: Team
---

# Standup

Turns the current board into a short report for the team. It leaves one report file with a draft message. It sends nothing.

## Input

Nothing: `/standup`.

Optional: `--skip-board` uses the newest saved board and does not build a new one.

## Reads

- Project profile in `AGENTS.md`: `packs`, `ticket_prefix`, `required_reviewers`, `output_language`, `external_writes`.
- `agent/rules/writing.md`, `agent/rules/ask-first.md`.
- `agent/skills/board-status/SKILL.md` for how the board is built.
- The newest board in `local-docs/notes/cycles/<cycle>/` and the newest earlier standup in `local-docs/notes/reports/`.

## Steps

1. Run `scripts/profile.sh get packs`. If the value does not include `team`, say "The team pack is off for this project." and stop.
2. Get the board:
   - without `--skip-board`: follow the steps of `agent/skills/board-status/SKILL.md` to build and save a new board;
   - with `--skip-board`: read the newest `board-*.md` in `local-docs/notes/cycles/<cycle>/`. If there is none, tell the person to run `/board-status` and stop.
3. Find the start of the period: the time of the newest earlier standup file. If there is none, use the start of the previous working day in the person's local time zone, and say so in the report.
4. List what merged in the period: `gh pr list --author @me --state merged --search "merged:>=<start date>" --json number,title,url,mergedAt,headRefName`. Add the tickets whose Linear status changed to a "done" meaning in the period.
5. Put every item in exactly one section:

   | Section | Comes from |
   |---|---|
   | Merged | Step 4 |
   | In review | Board groups "Needs review", "Ready to merge" and "Checks running" |
   | Working on | Board groups "Needs a fix", "Approved, needs a fix" and "In progress, no pull request" |
   | Blocked | Any item that cannot move until another person acts |
   | Next | Board group "Not started", the 2 highest priority levels only |

6. An item is blocked only when you can name who must act and on what: a review from a required reviewer, an answer on a ticket, a change owned by another person. An item you can fix yourself is "Working on".
7. For each item in "Working on", write 2 lines: what the change does, and what is left to do today.
8. Write the draft message: at most 10 lines, one line per item, ticket id first.
9. Save the report (see Output). Print the whole report and the file path.
10. Ask one question: "Do you want me to post the draft message, and where?" Post only after a yes, and only to the place the person names.

## Output

The file `local-docs/notes/reports/standup-<YYYY-MM-DD-HHmm>.md`, in the profile's `output_language`, in the shape that `agent/rules/writing.md` requires for a saved document. Date and time use the person's local time zone, and the file names the zone. Sections, in this order:

1. Summary: the count per section.
2. Merged: ticket, title, pull request, merge time.
3. In review: ticket, pull request, title, who must review.
4. Working on: ticket, pull request, title, kind of fix, the 2 lines from step 7.
5. Blocked: ticket, who must act, on what, since when.
6. Next: ticket, title, priority.
7. Draft message.

Then a fixed report in the chat:

- **Done:** the report path, the board it used, the count per section.
- **Not done:** what could not be read, and whether the draft message was posted.
- **Next step:** `/fix-pr <PREFIX>-<n>` for the first item in "Working on". If that section is empty, `/start`.

## Do not

- Do not post the report to a chat, GitHub or Linear without the person's yes. See `agent/rules/ask-first.md`.
- Do not change a ticket's status, merge or push.
- Do not list work that is not in Linear or GitHub. If the person adds an item by hand, mark it "added by hand".
- Do not hard-code a time zone or a team name.

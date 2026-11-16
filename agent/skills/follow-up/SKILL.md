---
name: follow-up
description: Turns a pull request comment into a new ticket with full context, a suggested fix and test notes, and creates it only after the person says yes. Use when the user says "make a follow-up ticket for this comment", "this comment is out of scope, create a ticket" or "/follow-up".
disable-model-invocation: true
metadata:
  pack: team
  stage: Team
---

# Follow-up ticket from a pull request comment

Writes a new ticket for work that a pull request comment asks for and that will not be done in that pull request. It leaves a draft file in the notes folder of the original ticket. It creates the ticket in Linear only after the person's yes.

## Input

A pull request URL or a ticket id. Optional: `--comment <text or link>` to say which comment.

Example: `/follow-up <PREFIX>-123 --comment "the retry has no upper limit"`

## Reads

- Project profile in `AGENTS.md`: `packs`, `ticket_prefix`, `output_language`, `external_writes`.
- `agent/rules/writing.md`, `agent/rules/ask-first.md`.
- `agent/skills/pr-status/reference.md`: the 3 comment sources.
- The original ticket in Linear, and its parent ticket if it has one.
- The notes folder of the original ticket: `local-docs/notes/<feature>/<TICKET-ID>/`, or `local-docs/notes/<TICKET-ID>/`.

## Steps

1. Run `scripts/profile.sh get packs`. If the value does not include `team`, say "The team pack is off for this project." and stop.
2. Find the pull request. With a ticket id: `gh pr list --state all --search "<TICKET-ID>" --json number,url,title --limit 5`. If there are several, ask which one. Then: `gh pr view <number> --json number,title,body,url,author,headRefName` and `gh pr diff <number>`.
3. Read the original ticket through a tool with `linear` in its name: its text, team, labels, parent ticket and cycle. Without access, ask the person for the content. Never invent it.
4. Find the comment. Fetch the 3 comment sources with the queries in `agent/skills/pr-status/reference.md`. With `--comment`, match it. Without it, show a numbered list of the open comments (author, file, first line) and ask: "Which comment becomes the follow-up ticket?" Wait for the answer.
5. Understand the comment. Read it in full, with its replies. Read the file it points to, at the tip of the pull request's branch (`git fetch origin <head>`, `git show origin/<head>:<path>`). Say what kind of work it is: bug, refactor, missing behaviour, missing test or cleanup.
6. Research the fix. Read the affected code. Search the code base for how the same problem is solved elsewhere. List the files that would change. Give: the area (web, server, both, other), the effort (trivial: 1 or 2 lines; low: one file; medium: several files; high: a change of structure), and the risk (what could break).
7. Check for a duplicate: search Linear for an open ticket about the same thing. If you find one, show it and ask: "This ticket looks the same. Create a new one anyway?"
8. Write the draft `follow-up-<short-slug>.md` in the notes folder of the original ticket, in the profile's `output_language`. Sections, in this order:
   1. Context you need before reading.
   2. Proposed title.
   3. Where it comes from: the pull request (title, author, link), the original ticket (id, link), the comment (author, file and line, link).
   4. What was asked: the comment quoted exactly.
   5. Why it is not done in the original pull request.
   6. Current state: what a person sees today, then a table `File | What it does now`.
   7. Suggested fix: numbered steps (what to change and where, which tests to add).
   8. Scope: area, effort, risk.
   9. How to test: where to go, what to do, what must happen, and what existing behaviour must not change.
   10. Proposed fields: team (same as the original ticket), parent ticket (the original ticket's parent, or none), labels (copied when they fit), cycle (the next cycle), assignee, priority.
   11. Status block: Done / Not done / What you must do.
9. Priority: a blocking review comment is High; a suggestion is Medium; cleanup is Low.
10. Reply in chat with the proposed title, the proposed fields, and the path of the draft. Ask one question: "Create this ticket in Linear?" Wait for the yes. If the person changes a field, update the draft and ask again.
11. After the yes, create the ticket through a tool with `linear` in its name. The description is sections 3 to 9 of the draft. Without write access, say so; the person creates it from the draft.
12. Write the new ticket's id (`<PREFIX>-<n>`) and link at the top of the draft file, and add one line to `log.md` in the same folder: the date, the new ticket id, the comment it comes from.
13. Do not reply on the pull request. Add a "Draft message" to the draft file: one sentence for the comment's author that names the new ticket.

## Output

A fixed report:

- **Done:** the draft file with its path; the new ticket's id and link, if it was created; its cycle and priority.
- **Not done:** the ticket, if the person said no or there is no Linear access; the reply on the pull request (only drafted).
- **Next step:** `/refine-ticket` for the new ticket. If the suggested fix is already complete: `/create-spec`.

## Do not

- Do not create or change a ticket without the person's yes.
- Do not post or reply on the pull request, and do not resolve the comment.
- Do not change code. This skill only writes a ticket.
- Do not invent the content of a ticket or a comment you could not read.
- Do not put more than one comment in one follow-up ticket, unless the person asks.
- Do not change the original ticket's status or text.

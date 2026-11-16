---
name: define-app
description: Processes a "Define the app" ticket - asks its open questions one at a time, writes each answer into the ticket, writes the approved model of the app, then creates the project's milestones and first plan tickets. Use when the user says "define the app", "process the definition ticket <PREFIX>-123", "model this app", "create a definition ticket for <app>" or "/define-app".
disable-model-invocation: true
metadata:
  pack: core
  stage: Plan
---

# Define app

Takes one app from an idea to a plan. It works on one ticket of the type `app-definition` (title `Define the app: <name>`). It leaves: every question answered in the ticket, an approved model of the app in the ticket, milestones in the app's Linear project, and the first plan tickets. It writes no code and creates no repository.

A definition ticket is about a whole app. A module inside an app that already exists is the job of `new-module`.

## Input

One of these:

- A definition ticket that exists: `/define-app <PREFIX>-123`
- A new app with no definition ticket: `/define-app "Recipe box: save and plan meals"`. The skill then creates the ticket first (Phase 0).
- Nothing: the skill lists the open definition tickets and asks which one.

## Reads

- Project profile in `AGENTS.md`: `ticket_prefix`, `spec_location`, `output_language`, `external_writes`.
- `agent/rules/writing.md`, `agent/rules/ask-first.md`.
- `docs/workflow/sources-of-truth.md`.
- `reference.md` beside this file: the shapes of the definition ticket, the approved model, a milestone and a plan ticket.
- Linear, through any tool or MCP server with `linear` in its name: the ticket with its comments, the project it belongs to (description, milestones, tickets), and the projects the ticket names. Without access: ask the person for the ticket content; every text for Linear is then given as a draft to create by hand. Never invent ticket content.
- Every source the ticket and the project description link: documents, pages, repositories. Read-only.

## Steps

### Phase 0: find or create the ticket

1. With a ticket id: read the ticket in full. Check that it is a definition ticket: the title starts with `Define the app:` or the description has the line `Ticket type: app-definition` (Linear may store the value inside backticks; both count). If it is not, say so and stop.
2. With no input: list the tickets whose title starts with `Define the app:` and that are not done or canceled, with the count of open questions of each. Ask which one.
3. With an app name and no ticket: search Linear for a project and a definition ticket of that app, so nothing is duplicated. If the project is missing, ask whether to create it and in which team. Collect what is already known from the sources the person names. Write the ticket in the shape "Definition ticket" of `reference.md`: the common questions, plus the questions that only this app needs. Show the ticket text and ask for a yes before creating it.

### Phase 1: read

4. Read the project description and every source it links. Read the tickets and projects that the questions name.
5. For each open question, check whether a source already answers it. Do not write that answer yet. Keep it as a suggestion, with the source.
6. Tell the person, in at most 5 lines: the app, how many questions are open, how many have a suggested answer, and which sources were read and which could not be read.

### Phase 2: questions

7. Ask the open questions in the ticket's order, one at a time. An open question is one whose answer line says `Answer: Not answered`, after any bullet character (`-` or `*`) and any indent. For each one give: the question, the suggested answer with its source when there is one, and the options when the question lists them.
8. After each answer, write it into the ticket on that question's answer line, with the date: `Answer: <answer> (2026-01-31)`. Change nothing else in the ticket. `Answer: Not answered` occurs once per open question, so a partial edit must match the question's own line together with its answer line, copied exactly as Linear stores them (bullet, indent, numbering); read the ticket again when the match fails. If `spec_location` is `both` or `file`, also append the question and the answer to `local-docs/notes/<app>/<TICKET-ID>/log.md`. `<app>` is the app's name in lowercase with hyphens (`recipe-box`); create the folder when it is missing.
9. When the person says "I do not know yet" or "later": write `Answer: Open - <what is missing>` and go on. An open answer blocks Phase 3 only when it is one of the questions marked "needed for the model" in `reference.md`.
10. When an answer changes an earlier one, update the earlier line and say so.
11. When an answer raises a new question, add it at the end of the right group with the next number, then ask it.
12. The person can stop at any time. The ticket then holds the progress; the next run continues from the first open question.

### Phase 3: the model

13. When no question says `Not answered`, write the proposal in the shape "Approved model" of `reference.md`, from the answers only. Do not fill a gap with an assumption: a gap is a question, go back to Phase 2.
14. Show the full model and ask: "Do you approve this model?" Wait for a clear yes. Without it, stop here.
15. After the yes, replace the ticket's section `## Approved model` with the model and its approval date. Update the project description: replace the sentence that starts with `Not modeled` (and the sentence about the definition ticket after it) with a 3-line summary and a link to the ticket. If `spec_location` is `both` or `file`, save a copy as `local-docs/notes/<app>/overview.md` and add the decisions to `local-docs/notes/decisions.md`.

### Phase 4: the plan

16. From the model's milestones, propose: each milestone (name, one-line description), and under each milestone of version 1 the first plan tickets (title and one line each), in the order they must be done. A plan ticket is one piece of work that can be refined alone. Use `new-module` for a ticket that is a whole business module, and say so in its line.
17. Show the list and ask for a yes before writing anything to Linear.
18. Write to Linear, in this order: the milestones in the project; the plan tickets (shape in `reference.md`), each in its milestone, in the team of the definition ticket (not the profile's `ticket_prefix` when they differ), in the status `Backlog`; then the section `## Delivery plan` in the definition ticket with the ordered links. Reuse milestones and tickets that already fit. Do not create duplicates.
19. Tick the items of `## Done when` that are now true. Only when all 4 items are ticked, set the ticket to the profile's `finished_status`. Leave the status and say so when the profile has no such key, or when the ticket's team has no status with that name (statuses differ between Linear teams; list the team's statuses first).

## Output

- **Done:** the ticket id; questions answered in this run and in total; whether the model is approved; the milestones and tickets created, with links.
- **Not done:** the questions still open, by number; the phase where the run stopped, and why.
- **Next step:** `/define-app <ticket>` again when questions are open; `/refine-ticket` on the first plan ticket when the plan exists; `/new-module` for a plan ticket that is a whole module.

## Do not

- Do not answer a question for the person. A suggestion is shown as a suggestion and is written only after a yes.
- Do not ask two questions in one message.
- Do not write the model, milestones or tickets before the yes of that phase.
- Do not write code, create a repository or create a worktree.
- Do not change tickets or projects other than the definition ticket, its project, and the tickets this skill creates. A question about another ticket or project (move it, cancel it) is answered in the ticket; the change itself is made only when the person asks for it.
- Do not copy secrets or private values (money amounts, tax identifiers, health data) from a source into Linear.

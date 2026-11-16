---
name: cycle-report
description: Writes the end-of-cycle summary from Linear with what shipped, what is carried over and the estimate against the actual time. Use when the user says "cycle report", "summarize the cycle", "what did I ship this cycle" or "/cycle-report".
disable-model-invocation: true
metadata:
  pack: team
  stage: Team
---

# Cycle report

Summarizes one cycle from Linear and GitHub: what shipped, what is carried over, and how the estimates compare with what happened. It leaves one report file. It changes nothing in Linear.

## Input

Nothing for the current cycle: `/cycle-report`.

Optional: `--previous` reports on the cycle before the current one.

## Reads

- Project profile in `AGENTS.md`: `packs`, `ticket_prefix`, `output_language`.
- `agent/rules/writing.md`, `agent/rules/ask-first.md`.
- `docs/workflow/sources-of-truth.md` for where cycle files are saved.
- The cycle plan in `local-docs/notes/cycles/<cycle>/`, when `/plan-cycle` saved one.
- The `log.md` of each ticket in `local-docs/notes/`, when it exists.

## Steps

1. Run `scripts/profile.sh get packs`. If the value does not include `team`, say "The team pack is off for this project." and stop.
2. Read the cycle in Linear (current, or the one before with `--previous`): name, start date, end date. Read the tickets in it assigned to the person: id, title, status, priority, estimate, start date, completion date. Without Linear access, ask the person; never invent tickets.
3. Put each ticket in exactly one group, matching Linear statuses by meaning:
   - **Shipped:** done or merged.
   - **Carried over, in review:** has an open pull request.
   - **Carried over, in progress:** started, no open pull request.
   - **Not started.**
4. For each ticket, find its pull requests: `gh pr list --search "<PREFIX>-<n>" --state all --json number,title,state,createdAt,mergedAt,url`.
5. Compare with the cycle plan, if there is one: list the tickets that were planned and did not ship, and the tickets that were added after the plan.
6. Calculate:
   - tickets in the cycle, shipped, carried over, not started;
   - completion rate: shipped divided by tickets in the cycle;
   - pull requests merged in the cycle;
   - average time from pull request opened to merged.
7. Compare estimate with actual, for each shipped ticket:
   - **Estimate:** the ticket's estimate in Linear, or the one in the cycle plan. Say which.
   - **Actual:** the time recorded in the ticket's `log.md`. If there is none, the working days between the ticket's start date and completion date in Linear, marked "from Linear dates".
   - **Difference:** actual minus estimate.
   A ticket with no estimate or no actual is listed as "no data". Do not fill the gap with a guess.
8. For each carried-over ticket, write the one thing that blocks it: an open comment, a failed check, a missing review, work not finished.
9. Write "What slowed the cycle": only causes you can show in the data, each with the tickets it affected.
10. Save the report (see Output). Print the summary table and the file path.

## Output

The file `local-docs/notes/cycles/<cycle>/report.md`, in the profile's `output_language`, in the shape that `agent/rules/writing.md` requires for a saved document. Dates use the person's local time zone. Sections, in this order:

1. Summary table: the numbers from step 6.
2. Shipped: ticket, title, pull request, merge date.
3. Estimate against actual: ticket, estimate, actual, difference, source of the actual.
4. Carried over, in review: ticket, title, pull request, what blocks it.
5. Carried over, in progress: ticket, title, what is left.
6. Not started: ticket, title, priority.
7. Planned and not shipped; added after the plan.
8. What slowed the cycle.

Then a fixed report in the chat:

- **Done:** the report path, the completion rate, the number of tickets with estimate data.
- **Not done:** what could not be read, and the tickets listed as "no data".
- **Next step:** `/plan-cycle` to plan the next cycle with the carried-over tickets.

## Do not

- Do not change a ticket, a cycle or an estimate in Linear.
- Do not post the report anywhere without the person's yes. See `agent/rules/ask-first.md`.
- Do not report on other people's tickets unless the person asks.
- Do not present a calculated number as measured time. Name its source.

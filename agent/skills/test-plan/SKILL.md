---
name: test-plan
description: Writes a manual test plan for one ticket with preconditions, steps, expected results and edge cases. Use when the user says "write a test plan", "how do I test this ticket", "manual test steps" or "/test-plan".
disable-model-invocation: true
metadata:
  pack: team
  stage: Team
---

# Test plan

Writes the steps a person follows by hand to check that one ticket works. It leaves one file in the ticket's notes folder. It changes no code.

## Input

One ticket id: `/test-plan <PREFIX>-<n>`.

Optional: `--all` writes one plan for each of your tickets in the current cycle whose status means "waiting for a manual test".

## Reads

- Project profile in `AGENTS.md`: `packs`, `ticket_prefix`, `base_branch`, `output_language`.
- `agent/rules/writing.md`, `agent/rules/ask-first.md`.
- `docs/workflow/sources-of-truth.md` for the notes folder layout.
- The ticket in Linear, and its files in `local-docs/notes/<feature>/<TICKET-ID>/` (discovery, spec) when they exist.
- The ticket's pull request, through `gh`.
- The project's seed or fixture files, for test data.

## Steps

1. Run `scripts/profile.sh get packs`. If the value does not include `team`, say "The team pack is off for this project." and stop.
2. Read the ticket in Linear: title, description, acceptance criteria, parent ticket. Without Linear access, ask the person to paste the ticket. Never invent it.
3. Find the pull request: `gh pr list --search "<PREFIX>-<n>" --state all --json number,url,headRefName,state`. If there is more than one, ask which one. If there is none, write the plan from the ticket and the spec, and say so in the plan.
4. Read the change: `gh pr diff <number>`. Then read the screens and routes the change touches, so each step names the real route, button and label.
5. Find each feature flag the change depends on, and the value it needs.
6. Find the conditions a test needs: user role, state of the data, configuration. Take test users and test data from the project's seed or fixture files. Refer to them by the name they have there. If none fits, write what must be created and how. Do not write a password or a key in the plan.
7. For each acceptance criterion, write the scenarios:
   - the normal path;
   - edge cases: empty state, error state, limit values, a user without permission;
   - regression checks: behaviour that existed before and must still work.
8. If a criterion cannot be tested by hand, or is ambiguous, list it under "Open questions". Ask the person one question at a time only when the plan cannot be written without the answer.
9. Save the plan (see Output). Print the file path and the number of scenarios.
10. With `--all`: read the current cycle in Linear, select the tickets, run steps 2 to 9 for each one, then print one table: ticket, plan path, number of scenarios.

## Output

The file `local-docs/notes/<feature>/<TICKET-ID>/test-plan.md`, or `local-docs/notes/<TICKET-ID>/test-plan.md` when the ticket has no feature. It is in the profile's `output_language` and in the shape that `agent/rules/writing.md` requires for a saved document. Sections, in this order:

1. Header: ticket link, pull request link, date in the person's local time zone, feature flags.
2. Preconditions: a checklist of flag values, test user and role, test data, where to run it (local or a deployed environment), the branch.
3. Scenarios, numbered. Each has: name, type (normal, edge, regression), numbered steps, expected result.
4. Test data: where it comes from in the seed or fixture files, or how to create it.
5. Out of scope: what this plan does not cover.
6. Open questions.

Then a fixed report in the chat:

- **Done:** the plan path and the number of scenarios per type.
- **Not done:** criteria with no scenario, and why.
- **Next step:** `/e2e-test <PREFIX>-<n>` to automate the normal path, or `/open-pr` when the ticket has no pull request yet.

## Do not

- Do not change code, run a test suite or change data in a database.
- Do not post the plan to Linear or GitHub without the person's yes. See `agent/rules/ask-first.md`.
- Do not write test accounts, passwords or real customer data in the plan.
- Do not invent a route, a label or a flag name. Read it in the code first, or write "not verified".

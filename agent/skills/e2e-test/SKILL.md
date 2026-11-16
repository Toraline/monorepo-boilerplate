---
name: e2e-test
description: Writes an end-to-end test for one ticket in 3 phases - investigate the flow, write the test, open its pull request. Use when the user says "write an end-to-end test", "automate this flow", "e2e for this ticket" or "/e2e-test".
disable-model-invocation: true
metadata:
  pack: team
  stage: Team
---

# End-to-end test

Writes one end-to-end test (a test that uses the product the way a person does, through its real screens) for one ticket. It works in 3 phases and stops for the person's yes after each one. It leaves an investigation file, the test files in the ticket's worktree, and a pull request.

## Input

One ticket id: `/e2e-test <PREFIX>-<n>`.

Optional: `--phase investigate`, `--phase write` or `--phase pr` runs one phase only. `--skip-pr` stops after phase 2.

## Reads

- Project profile in `AGENTS.md`: `packs`, `ticket_prefix`, `base_branch`, `worktree_path`, `main_checkout`, `push`, `allow_no_verify`, `commit_format`, `check_command`, `output_language`, `external_writes`, `review_rules`, `required_reviewers`.
- `agent/rules/writing.md`, `agent/rules/git-safety.md`, `agent/rules/ask-first.md`.
- The project's own documentation on end-to-end tests: where they live, which tool runs them, the command, the conventions.
- The project's seed or fixture files, for test users and test data.
- The ticket in Linear and its files in `local-docs/notes/<feature>/<TICKET-ID>/`, including `test-plan.md` when it exists.
- `reference.md` beside this file: the layout of the investigation file and of the pull request text.

## Steps

1. Run `scripts/profile.sh get packs`. If the value does not include `team`, say "The team pack is off for this project." and stop.
2. Find where the end-to-end tests live and how they run. Read the project's documentation. If it does not say, ask one question at a time: the folder, then the command to run one test. Tell the person to write the answers in the project's documentation. If the tests live in another repository, ask for its path and use that repository's own rules.

**Phase 1: investigate (read-only)**

3. Read the ticket in Linear: description, acceptance criteria. Without Linear access, ask the person to paste it.
4. Read the code of the flow. Collect: routes, visible labels, button texts, headings, which roles may use it, feature flags.
5. Read the existing end-to-end tests of the same area and the shared helpers. Note what can be reused.
6. Write the flow as a table: step, route, action, expected result. Add the roles to test and the data that must exist first.
7. Find test users and test data in the seed or fixture files. Refer to each by the name it has there. If something is missing, write what must be added to the seed or fixture files. Never use real accounts or real data.
8. Save `e2e-investigation.md` in the ticket's notes folder (layout in `reference.md`). Show the flow and the test data to the person. Wait for a yes.

**Phase 2: write the test**

9. Run `make worktree-list`. If the ticket has no worktree, run `make worktree TICKET=<n> SLUG=<short-slug>`. Work only inside it.
10. Present the plan: the file paths, the helpers to add, and each flow step with its action and its check. Wait for a yes.
11. Put every value that can change in one configuration file next to the test: routes, labels, expected texts, form values, time limits, references to fixtures. Credentials come from fixtures or environment variables, never as text in a file.
12. Reuse existing helpers. Add a helper only for a step that 2 or more tests need.
13. Write the test in the project's conventions. Without a convention, use these:
    - find elements the way a person does: by role, label or visible text;
    - wait for a condition, never for a fixed time;
    - the test creates what it needs and removes what it created;
    - the test file reads as the flow: sign in, go to the page, act, check.
14. If the project runs the tests against more than one environment, keep each environment's values in the configuration file, and list in the investigation file what each environment must contain.
15. Run the test with the project's command, then run the profile's `check_command`. If the test fails, fix it and run it again. If it cannot run on this machine, say so and ask the person to run it. Do not continue until it passed once.

**Phase 3: pull request**

16. Check the changed files against the file named in the profile's `review_rules`. If the key is missing, ask once which file holds the team's review rules, and tell the person to add a `review_rules` row to the profile table in `AGENTS.md`.
17. Stage the files by name and commit in the profile's `commit_format`. Follow `agent/rules/git-safety.md`.
18. Push according to the profile's `push`.
19. Write the pull request text (layout in `reference.md`) and save it as `e2e-pr.md` in the ticket's notes folder.
20. If `external_writes` lists opening a pull request, open it against `base_branch` with `gh pr create --base <base_branch> --body-file <path>`. Otherwise show the text and ask first.
21. Name the reviewers from `required_reviewers`. If the key is missing, ask once and tell the person to add it to the profile table. Request a review only after the person's yes.

## Output

- `local-docs/notes/<feature>/<TICKET-ID>/e2e-investigation.md` and `e2e-pr.md` (or under `local-docs/notes/<TICKET-ID>/`), in the profile's `output_language`.
- The test files, in the ticket's worktree.

Then a fixed report in the chat:

- **Done:** the phases finished, the test file paths, the result of the last run, the pull request link.
- **Not done:** the phases not run, test data that is still missing, anything not verified.
- **Next step:** `/pr-status <number>` once the pull request is open. After `--skip-pr`: `/review-diff`, then `/commit`.

## Do not

- Do not write a password, a token, an e-mail address of a real person or real customer data in a test, a configuration file or a note.
- Do not change the product's code to make the test pass. If the test finds a bug, stop and report it.
- Do not change data in a shared or production database. See `agent/rules/ask-first.md`.
- Do not work on the main checkout when `main_checkout` is `protected`. Do not use `--no-verify` unless `allow_no_verify` is `yes`.
- Do not merge the pull request and do not request a review without a yes.
- Do not skip, weaken or delete an existing test.

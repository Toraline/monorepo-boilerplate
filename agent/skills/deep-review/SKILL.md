---
name: deep-review
description: Slow review of your own branch for edge cases, regressions and consistency, before you ask another person to review it. Use when the user says "deep review my branch", "check this before I ask for review" or "/deep-review".
disable-model-invocation: true
metadata:
  pack: team
  stage: Team
---

# Deep review of your own branch

Reads every changed file of your branch in full and checks edge cases, regressions, consistency and test coverage. It leaves one review file in the ticket's notes folder. It changes no code.

## Input

A ticket id or a pull request URL. Optional: `--focus <area>` (for example `dates`, `permissions`, `data-flow`).

Example: `/deep-review <PREFIX>-123 --focus dates`

## Reads

- Project profile in `AGENTS.md`: `packs`, `ticket_prefix`, `base_branch`, `output_language`, `review_rules`.
- `agent/rules/writing.md`, `agent/rules/git-safety.md`, `agent/rules/ask-first.md`.
- The file named in `review_rules`.
- The ticket in Linear and its spec.
- The ticket's notes folder: `local-docs/notes/<feature>/<TICKET-ID>/`, or `local-docs/notes/<TICKET-ID>/`.
- Shared documentation of the feature in `docs/`, if a folder for it exists.

## Steps

1. Run `scripts/profile.sh get packs`. If the value does not include `team`, say "The team pack is off for this project." and stop.
2. Find what to review:
   - With a pull request URL: `gh pr view <url> --json number,title,headRefName,baseRefName,url`.
   - With a ticket id: `gh pr list --author @me --state open --search "<TICKET-ID>" --json number,headRefName,baseRefName,url`.
   - With no pull request yet: find the ticket's worktree with `make worktree-list` and compare its branch with `origin/<base_branch>`.
   - If nothing is found, ask: "Which branch or pull request should I review?" Wait for the answer.
3. Read the ticket and its spec through a tool with `linear` in its name. Without access, ask the person for the content. Read every file in the ticket's notes folder.
4. Run `scripts/profile.sh get review_rules`. If it is empty, ask once: "Which file holds the rules a review checks against?" Tell the person to add a `review_rules` row to the profile table in `AGENTS.md`. Read that file.
5. Get the diff: `gh pr diff <number>`, or `git diff origin/<base_branch>...<branch>` when there is no pull request. For each changed file, read the whole file at the tip of the branch (`git show origin/<branch>:<path>`, or the file in the worktree). Do not change branch.
6. For each changed file, check these 4 groups. With `--focus`, do that area first and in more depth; still do the others.
   - **Data flow.** Follow each new value from where it is created to every place that reads it. Is the format the same everywhere? Is there a hidden assumption about order, about empty values, or about format? Does a filter interact with a limit before it or a reader after it?
   - **Limits.** What happens with: no value, zero, an empty text, an empty list, one item, the first item, the last item, more items than expected? Dates: time zone, end of month, leap year, clock change. Numbers: negative, very large, not a number. Text comparison: are both sides in the same format?
   - **Effects between files.** Does a change in one file break what another file assumes? Do two filters give a different result in the other order? Does an early return happen before a side effect that must still run (cache, log, metric)?
   - **Regression.** Is the old behaviour unchanged when the new option is off or empty? Was every caller of a changed function updated (search for them)? Do test doubles match the new function signatures?
7. Consistency. If the change passes one value through several places, list every place that reads, formats, compares or passes it. Check that the format, the comparison and the handling of empty values are the same in all of them.
8. Test coverage. For each changed behaviour: is there a test for the new path? Is there a test that the default or disabled path still works? Which edge cases from step 6 have no test?
9. Quick quality pass against the `review_rules` file: unused imports, unclear names, loose types, comments that repeat the code, a pattern that differs from the rest of the code base.
10. Compare the change with the ticket: is every acceptance point covered? Is anything changed that the ticket did not ask for?
11. Write `deep-review-v<N>.md` in the ticket's notes folder, in the profile's `output_language`. `<N>` is the next free number. Sections, in this order:
    1. Context you need before reading.
    2. Summary: is the branch ready for review, in 1 or 2 sentences.
    3. Edge cases checked: per file, a table `Scenario | Result | Correct?`.
    4. Consistency check: a table `Place | Operation | Format or comparison | Consistent?`.
    5. Test coverage: a table `Scenario | Covered? | Test file`.
    6. Ticket check: a table `Acceptance point | Covered? | Where`.
    7. Problems found, most severe first. For each: severity (Critical, Medium, Low), `file:lines`, what a person sees, the cause in the code, when it breaks, the exact fix. Or "None".
    8. Status block: Done / Not done / What you must do.
12. Reply in chat with: the number of problems by severity, the most important one in one sentence, and the path of the file.

## Output

A fixed report:

- **Done:** `deep-review-v<N>.md`, with its path, and the number of problems by severity.
- **Not done:** files or checks that were skipped, and every claim that was not verified by reading or running.
- **Next step:** with problems: `/execute-spec` to fix them in the ticket's worktree, then `/deep-review` again. With no problems: `/open-pr`, or ask for review if the pull request exists; then `/pr-status`.

## Do not

- Do not edit, stage, commit or push anything. Do not change branch.
- Do not post anything on the pull request or the ticket.
- Do not report a problem you did not confirm in the code. Mark a doubt as "open question".
- Do not start a subagent. This skill runs in the current session.
- Do not hide a problem because it is small; give it the severity Low.

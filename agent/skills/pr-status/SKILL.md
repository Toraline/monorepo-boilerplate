---
name: pr-status
description: Reports the health of one pull request - open comments from 3 sources, CI, conflicts and required reviewers - and writes pr-status.md in the ticket's notes folder. Use when the user says "status of this pull request", "what is blocking my PR" or "/pr-status".
disable-model-invocation: true
metadata:
  pack: team
  stage: Team
---

# Pull request status

Checks one pull request and says what blocks it from being merged. It leaves `pr-status.md` in the ticket's notes folder. It reads only; it changes no code and posts nothing.

## Input

A pull request URL or number, or a ticket id.

Example: `/pr-status <PREFIX>-123`

## Reads

- Project profile in `AGENTS.md`: `packs`, `ticket_prefix`, `commit_format`, `output_language`, `review_rules`, `required_reviewers`.
- `agent/rules/writing.md`, `agent/rules/git-safety.md`, `agent/rules/ask-first.md`.
- `reference.md` in this folder: the 3 comment queries, the classification rules, the status categories, the layout of the file.
- The file named in `required_reviewers` (for example a CODEOWNERS file) and the file named in `review_rules`.
- The previous `pr-status.md` of the ticket, if it exists.

## Steps

1. Run `scripts/profile.sh get packs`. If the value does not include `team`, say "The team pack is off for this project." and stop.
2. Find the pull request. With a ticket id: `gh pr list --state open --search "<TICKET-ID>" --json number,url,headRefName`. If there are several or none, ask: "Which pull request?" Wait for the answer.
3. Fetch it: `gh pr view <number> --json number,title,body,url,author,labels,headRefName,baseRefName,mergeable,mergeStateStatus,reviewDecision,statusCheckRollup,reviews,reviewRequests,commits,files`.
4. Find the ticket id (`<PREFIX>-<n>`) in the head branch name or the title. The notes folder is `local-docs/notes/<feature>/<TICKET-ID>/` if it exists, else `local-docs/notes/<TICKET-ID>/` (create it). With no ticket id, ask once which ticket the pull request belongs to.
5. Read the previous `pr-status.md` in that folder, if there is one. Keep it for step 13.
6. **Conflicts.** Read `mergeable` and `mergeStateStatus`. If the value is `UNKNOWN`, wait 10 seconds and fetch once more. If there are conflicts, list the files: `git fetch origin <base> <head>`, then `git merge-tree --write-tree --name-only origin/<base> origin/<head>`. This command changes nothing.
7. **Comments, 3 sources.** Run the 3 queries in `reference.md`: review threads (comments on a line), review bodies (the text of a whole review), timeline comments (general comments). A check that reads only one source misses comments.
8. Classify each comment with the rules in `reference.md`: from a person or from an automated account; blocking, actionable, question or informational. Number them.
9. **CI.** `gh pr checks <number>`. For each failed check, read the log (`gh run view <run-id> --log-failed`) and copy the first error. List the checks that are still running.
10. **Required reviewers.** Run `scripts/profile.sh get required_reviewers`. If it is empty, ask once: "Which file or rule says who must review?" Tell the person to add a `required_reviewers` row to the profile table in `AGENTS.md`. Match the changed files to the owners in that file. For each owner give one state: not reviewed, reviewed but new commits came after, reviewed with open comments, approved on the latest commit. If you cannot read who is in a team, say "not verified".
11. **Rules.** Read the diff (`gh pr diff <number>`) and check it quickly against the file named in `review_rules`. List only clear breaks of a rule. If `review_rules` is empty, write "not checked".
12. **Title and description.** Does the title follow `commit_format` and name the ticket? Does the description say what changed and how to test it?
13. Give the pull request one status with the categories in `reference.md`. The first matching rule wins. A pull request with any problem is "needs fix", never "needs review".
14. Write `pr-status.md` in the notes folder with the layout in `reference.md`, in the profile's `output_language`. There is one status file per ticket: replace the previous one, and add "Changes since last check" (fixed, new, still open) when there was one.
15. Reply in chat with: the status, a table of what blocks the merge (one line each), and the path of the file.

## Output

A fixed report:

- **Done:** `pr-status.md`, with its path, and the status of the pull request.
- **Not done:** each check that could not be run (for example a log that could not be read, team members that could not be listed), and why.
- **Next step:** by status:
  - needs fix, comments: `/validate-comments`, then `/fix-pr`.
  - needs fix, conflicts: `/fix-conflicts`.
  - needs fix, CI: `/fix-pr`.
  - waiting CI: `/pr-status` again when CI ends.
  - needs review: the person asks the named reviewer.
  - ready to merge: the person merges. This skill never merges.

## Do not

- Do not edit, stage, commit, push or change branch.
- Do not post, reply to or resolve a comment. Do not request a review.
- Do not merge and do not enable auto-merge.
- Do not read only one comment source.
- Do not guess the cause of a CI failure; quote the log, or say the log was not read.

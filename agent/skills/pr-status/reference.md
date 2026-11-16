# Pull request status: queries, rules and layout

Used by `agent/skills/pr-status/SKILL.md` and by `agent/skills/babysit/SKILL.md`. `<owner>`, `<repo>` and `<N>` come from the pull request.

## The 3 comment sources

1. **Review threads** (comments on a line of code):

```bash
gh api graphql -f query='query { repository(owner:"<owner>", name:"<repo>") { pullRequest(number:<N>) { reviewThreads(first:100) { nodes { isResolved isOutdated comments(first:20) { nodes { author { login __typename } body path line url createdAt } } } } } } }'
```

2. **Review bodies** (the text of a whole review, not tied to a line):

```bash
gh api graphql -f query='query { repository(owner:"<owner>", name:"<repo>") { pullRequest(number:<N>) { reviews(first:100) { nodes { author { login __typename } state body url submittedAt } } } } }'
```

3. **Timeline comments** (general comments on the pull request):

```bash
gh api repos/<owner>/<repo>/issues/<N>/comments --paginate --jq '.[] | {author: .user.login, type: .user.type, body: .body, url: .html_url, created: .created_at}'
```

If a list returns 100 items, there may be more: fetch the next page.

## Person or automated account

An account is automated when `__typename` or `type` is `Bot`, or its login ends in `[bot]`. Every other account is a person.

## Which comments count as open

| Source | From | Counts as open when |
|---|---|---|
| Review thread | Automated | Not resolved and not outdated |
| Review thread | Person | Not resolved. A resolved thread counts as open only if a person replied after it was resolved |
| Review body | Anyone | State is `CHANGES_REQUESTED` and the same reviewer has no newer approval: **blocking** |
| Review body | Person | State is `COMMENTED`, the body is not empty, and no commit came after it |
| Review body | Automated | State is `COMMENTED`: informational only |
| Timeline comment | Person | Always, unless the same person later wrote that it is solved |
| Timeline comment | Automated | Never (these are notices) |

## Severity of an open comment

| Severity | Meaning |
|---|---|
| blocking | A review that requests changes, or a comment that says the change must be made |
| actionable | Has a concrete suggestion |
| question | Asks something and has no answer yet |
| informational | An observation; no action needed |

## Status categories (the first matching rule wins)

1. **needs fix** when any of these is true: a CI check failed; there are conflicts; a person's comment is open (blocking, actionable or question); an automated comment is open with severity blocking or actionable; a review requests changes and no newer commit answers it.
   - Tags, one or more: `comment`, `human-comment`, `changes-requested`, `CI`, `conflict`.
   - If a required reviewer already approved: write **approved but needs fix** (fix, then ask for a second review). Otherwise **needs fix** (fix, then ask for the first review).
2. **waiting CI**: no check failed and at least one is still running.
3. **needs review from `<owner>`**: CI passed, no conflicts, no open comments, and a required approval is missing. Say if it is a first review or a second review.
4. **ready to merge**: approved, CI passed, no conflicts, no open comments.
5. **needs test**: a reviewer asked for a manual test, or a large logic change has no test.

## Layout of `pr-status.md`

1. Title: `Pull request status: <TICKET-ID>: <title>`
2. Header lines: URL, branch, author, status, tags, date and time.
3. Context you need before reading.
4. Summary: 2 or 3 sentences.
5. Changes since last check (only if a previous file existed): fixed, new, still open.
6. Conflicts: "None", or the list of files.
7. CI: "All passed", or each failed check with its first error, and each check still running.
8. Open comments, numbered across the 4 groups: Blocking (person), Blocking (automated), Questions, Informational. Each line: source, author, file and line, what must change, link.
9. Required reviewers: a table `Owner | State | Reviewer | Note`, then one line "Action needed".
10. Rules: breaks of the review rules file, or "None", or "not checked".
11. Title and description: what to correct, or "Fine".
12. Next actions: numbered, in the order they must happen.
13. Status block: Done / Not done / What you must do.

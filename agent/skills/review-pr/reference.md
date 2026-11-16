# Layout of a review file

Used by `agent/skills/review-pr/SKILL.md`. The reader has no context about the feature and reads literally. Follow `agent/rules/writing.md`.

## Sections, in this order

1. **Title:** `Pull request #<number>: <title>`
2. **Header lines:** author, base branch, head branch, files changed (+added, -removed), labels, review date, full URL, ticket id (or "no ticket").
3. **Context you need before reading.** One line per term the review uses: product terms, acronyms, flow names, data concepts. No code.
4. **What this pull request does.** 2 to 4 sentences: what the user sees that is new, then what the system does.
5. **How the new flow works, step by step.** Numbered. At each step: what the user does and what the system does. End with the server steps: what is checked, what is written, in what order.
6. **Good parts.** 3 to 5 lines. Only notable protections or behaviours, named in words.
7. **Already raised by automated reviewers** (only if there are any). One line each: what it is, and whether the author fixed it, declined it (with the reason), or left it open. Do not repeat these under Comments unless you disagree; then say so.
8. **Comments.** One block per finding, most severe first. Layout below.
9. **Minor notes.** Things that do not need a comment. Mark each one as "verified" or "open question".
10. **Verdict.** `Approve`, `Approve with comments` or `Request changes`, with one sentence that names the 1 or 2 comments that matter most.
11. **Status block:** Done / Not done / What you must do.

## One comment block

```
### Comment <N>: <Blocker | Non-blocker>

| | |
|---|---|
| File | `<path>` line <NN> (line in the file after the change) |
| Effort | Trivial / Small / Medium / Large |
| Blocker | Yes / No, one sentence why, and "happens today" or "only when <situation>" |
| Rule | The rule in the review rules file that it breaks, or "none" |

**What a person sees**
Plain words only. No code, no file names. The exact sequence: who does what, what they see, what the system does, what goes wrong, when they find out. Use concrete numbers.

**What happens in the code**
Plain sentences first. A name of a function, field or file appears only as an example in parentheses after the sentence that explains it.

**The fix**
In words first. Then an exact code suggestion if it makes the fix clearer. With two options: give both and say which one you recommend and why.

**Draft message**
The exact comment text, in a quote block:
1. One line: what is flagged, and "blocker" or "not a blocker".
2. What happens in the code, naming the function or field so the author can find it.
3. What the user ends up seeing, in 1 or 2 sentences.
4. The suggestion in words, then example code if useful.
5. One direct question or one concrete request.
Each paragraph has at most 2 lines.
```

## Definitions

| Word | Meaning |
|---|---|
| Blocker | A security hole, a risk of wrong or lost data, a missing permission check, or a bug every user of the flow will hit |
| Non-blocker | Protection against unlikely cases, future maintenance, a missing error message for an unlikely failure |
| Trivial | One line |
| Small | A few lines, one new check, one changed message |
| Medium | A new function, a restructured block, a new test |
| Large | A new file or a change across several areas |

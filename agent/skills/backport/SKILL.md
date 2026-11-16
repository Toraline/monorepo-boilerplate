---
name: backport
description: Carries a merged change to another release branch by cherry-pick, in its own worktree, and opens that pull request. Use when the user says "backport this ticket to <branch>", "cherry-pick this fix to the release branch" or "/backport".
disable-model-invocation: true
metadata:
  pack: team
  stage: Team
---

# Backport a merged change

Copies the commits of a merged pull request onto another release branch, one commit at a time, and opens a pull request there. It leaves `backport-<target>.md` in the ticket's notes folder, with every commit picked and every conflict resolved.

## Input

A ticket id and a target branch. The target must be one of the profile's `release_branches`.

Example: `/backport <PREFIX>-123 release-2.4`

## Reads

- Project profile in `AGENTS.md`: `packs`, `ticket_prefix`, `base_branch`, `worktree_path`, `main_checkout`, `push`, `allow_no_verify`, `commit_format`, `check_command`, `output_language`, `external_writes`, `release_branches`.
- `agent/rules/writing.md`, `agent/rules/git-safety.md`, `agent/rules/ask-first.md`.
- The ticket in Linear, and its spec.
- The ticket's notes folder: `local-docs/notes/<feature>/<TICKET-ID>/`, or `local-docs/notes/<TICKET-ID>/`.

## Steps

1. Run `scripts/profile.sh get packs`. If the value does not include `team`, say "The team pack is off for this project." and stop.
2. Run `scripts/profile.sh get release_branches`. If it is empty, ask once: "Which branches are release branches?" Tell the person to add a `release_branches` row to the profile table in `AGENTS.md`. If the target is not in the list, or is the `base_branch`, say so and stop.
3. Find the source pull request: `gh pr list --search "<TICKET-ID>" --base <base_branch> --state merged --json number,url,title,headRefName,mergeCommit,commits`. If none is merged, say that the change is not merged yet and stop. If there are several, ask which one.
4. Read the ticket through a tool with `linear` in its name, and the files in its notes folder. Without access, ask the person. If the ticket names the release branches that need the change and the target is not among them, ask: "The ticket does not name <target>. Backport anyway?"
5. Look for a backport that already exists: `gh pr list --search "<TICKET-ID>" --base <target> --state all --json number,url,headRefName,state`. If one is open, use its branch and pick only the commits it does not have. If one is merged and has every commit, say so and stop.
6. List the commits to pick. `git fetch origin <base_branch> <target>`, then `git rev-list --parents -n 1 <mergeCommit>`:
   - One parent (the pull request was squashed): pick that one commit.
   - Two parents (a merge commit): pick the pull request's own commits, in order (`gh pr view <number> --json commits`). Skip merge commits inside it and list them as skipped.
   Show: the pull request, the commits (hash and message), the target.
7. Preview what the change depends on: `git log --oneline origin/<target>..origin/<base_branch> -- <changed files>`. These commits touch the same files and are not on the target. If the change needs one of them, list it and ask before picking another person's commit.
8. Create the worktree, from the main checkout. `make worktree` starts from `base_branch`, so use git directly:
   - Path: the profile's `worktree_path` with `-backport-<target>` at the end.
   - Branch: `<person>/<prefix>-<n>-backport-<target>`, the same pattern `make worktree` uses.
   - `git worktree add -b <branch> <path> origin/<target>` (for an existing backport branch: `git worktree add <path> <branch>`).
   Then, in the worktree, check `git rev-parse --show-toplevel`. If it is the main checkout, stop.
9. Pick each commit, one command per commit: `git cherry-pick -x <hash>`.
   - Never use `--no-commit`, never squash the picks, never apply a diff by hand, never pick a commit that is itself a backport.
   - Generated files: do not pick them; generate them again on the target with the project's command.
   - Something the target needs on top (for example a test that differs there) goes in a separate commit after the picks, named for what it adapts.
10. If a pick stops with conflicts, for each file: read both sides; read `git log --oneline -5 -- <file>` on both branches to find the owners; then:
    - Resolve when it is safe: imports, separate sections of a file, lock files and generated files (generate again).
    - Escalate when: both sides changed the same logic with a different intent; the code handles money, permissions or personal data; you do not understand one side. To escalate: stop, explain both sides, and ask the person one question. Do not push.
    - The goal: no lost behaviour on the target, and no lost behaviour in the picked change.
    - Stage the resolved files by name and run `git cherry-pick --continue --no-edit` before the next pick. Use `--no-verify` only if `allow_no_verify` is `yes`.
11. Run the profile's `check_command` in the worktree. Fix only failures caused by the picks. Report each check as passed, failed or not run.
12. Push and open the pull request, if the profile's `push` is `push` and `external_writes` lists them; otherwise ask first.
    - `git push --set-upstream origin <branch>`
    - `gh pr create --base <target> --head <branch>`, with a title in `commit_format` that ends with "(backport to <target>)". The body has: the link to the source pull request and the ticket, the picked commits (hash and message), the skipped commits, the adaptation commits, the conflicts resolved.
    - For a backport pull request that already existed: push only.
13. Write `backport-<target>.md` in the notes folder, in the profile's `output_language`: context you need before reading; source and backport pull request links; a table of picked commits; skipped commits; per conflict: what the target had, what the pick brings, the owner of each side, the resolution, why it is safe, the risk; files changed; escalated conflicts; checks; status block.
14. Keep the worktree and print its path. `make worktree-remove` does not know this path; the person removes it after the backport is merged.

## Output

A fixed report:

- **Done:** the backport pull request (link), the commits picked, the conflicts resolved, and the path of `backport-<target>.md`.
- **Not done:** escalated conflicts, skipped commits, checks that failed or were not run, and the push or the pull request if they wait for a yes.
- **Next step:** `/pr-status` for the backport pull request. With an escalated conflict: answer the question, then `/backport` again with the same input.

## Do not

- Do not backport a change that is not merged.
- Do not squash, amend, rebase or force-push. Do not merge the pull request.
- Do not pick another person's commit without the person's yes.
- Do not fold an adaptation into a picked commit.
- Do not run git changes on the main checkout's branch or files when `main_checkout` is `protected`.
- Do not post a comment on the source pull request or the ticket.

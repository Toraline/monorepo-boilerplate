---
name: release
description: Prepares the release of one product of the repository - asks which product is released, checks that product's version, and leaves the release ticket and the text of the release pull request. Never publishes, tags or merges. Use when the user says "prepare the release", "what goes in this release", "release <version>" or "/release".
disable-model-invocation: true
metadata:
  pack: core
  stage: Deliver
---

# Release

Prepares the release of one product. A **product** is one thing that this repository releases by itself, with its own version: an app that is deployed, one npm package, several npm packages that share one version, or a template. The skill asks which product is released, checks that product's version, and works out which pull requests and tickets are in the release and what can go wrong. It leaves one release ticket in Linear, the release pull request's title and body in a local file, and a log. A person publishes, tags and merges.

## Input

Optional: the product, the version, and the number of the release pull request. Examples: `/release <version>`, `/release <product> <version>`.

## Reads

- Project profile in `AGENTS.md`: `ticket_prefix`, `base_branch`, `external_writes`, `output_language`. Read one value with `bash scripts/profile.sh get <key>`.
- `agent/rules/git-safety.md`, `agent/rules/ask-first.md`, `agent/rules/writing.md`.
- The release document of the project: `docs/releasing.md`. When that file does not exist, the first file that `grep -rlE '^#+ Products *$' docs` prints. It holds the table "Products" and the steps that a person does to release.
- The project's documentation about deployment and rollback under `docs/`, when it exists.
- GitHub, through the `gh` CLI. Linear, through any tool or MCP server with `linear` in its name. Without access to Linear: ask the person for the tickets' content. Never invent it.
- The release ticket's notes folder: `local-docs/notes/<PREFIX>-<n>/`, created in step 9.

## The table "Products"

The table is in the release document, under a heading `Products`. It has one row per product and these 7 columns. The skill only reads it. It names no product by itself.

| Column | What the cell holds |
|---|---|
| Product | The name the person uses for the product. One short word or a package name |
| Version files | Every file that holds the version of the product, separated by commas. The first one is the main one. A file named `package.json` is read at its key `version`. Any other file holds the version alone on one line. Another place is written in round brackets after the path, for example `package-lock.json` (key `packages` > `packages/ui` > `version`). `none`: no file holds the version |
| Released by | How a release of the product happens, one or more of these 3 forms, separated by `;`. `tag <pattern>`: a git tag; the pattern holds `<version>`, for example `v<version>` or `web-v<version>`. `npm <package>`: a package on the npm registry. `deploy <how>`: a deploy, with what starts it |
| Last released version | One command for each real source of the last released version, separated by `;`. The first line that a command prints is the answer. Examples: `npm view <package> version`, `git tag --list 'web-v*' --sort=-v:refname`, `gh release list --limit 1` |
| Paths | The folders and files that the product owns, separated by commas. A folder ends with `/`. `all`: the whole repository |
| Changes file | The file that lists the changes of one release. `<version>` in the path stands for the version, for example `updates/<version>.json`. A file with no `<version>` in its path, for example `CHANGELOG.md`, must hold the version in its text. `none`: the product has no such file |
| Workflow | The path of the workflow file that releases the product, for example `.github/workflows/release.yml`. `none`: no workflow |

How many rows a repository has:

- Things that are always released together, with one version, are **one** product. Its cell "Version files" names every file, and its cells "Released by" and "Last released version" name every package and tag.
- Things that can be released alone are one product each. Each has its own tag pattern and its own paths.

Three examples with invented names:

| Product | Version files | Released by | Last released version | Paths | Changes file | Workflow |
|---|---|---|---|---|---|---|
| `app` | `VERSION` | tag `v<version>`; deploy: the workflow deploys the tag | `git tag --list 'v*' --sort=-v:refname` | `all` | `CHANGELOG.md` | `.github/workflows/deploy.yml` |
| `library` | `packages/core/package.json`, `packages/react/package.json` | npm `@example/core`; npm `@example/react` | `npm view @example/core version`; `npm view @example/react version` | `packages/` | `CHANGELOG.md` | `.github/workflows/release.yml` |
| `web` | `apps/web/package.json` | tag `web-v<version>`; deploy: a merge into `production` | `git tag --list 'web-v*' --sort=-v:refname` | `apps/web/`, `packages/shared/` | `none` | `none` |

## Steps

1. **Choose the product.**
   1. Read the table "Products" of the release document.
   2. **No table, or no release document:** say "This repository has no table "Products"." Then propose one from what the repository holds. Look at:
      - version files: `git ls-files | grep -E '(^|/)(VERSION|package\.json|pyproject\.toml|Cargo\.toml)$'`. A `package.json` with `"private": true` is not published to npm.
      - package names: the key `name` of each `package.json` that is not private. `npm view <name> version` says whether it is on npm, and at which version.
      - tags: `git fetch origin --tags`, then `git tag --sort=-creatordate | head -20`. The names show the tag patterns.
      - workflows: `grep -lE 'npm publish|workflow_dispatch|deploy' .github/workflows/*`. Read each one that matches: what it publishes or deploys, and from which input.
      - the documents under `docs/` about releasing and deployment, and a change list (`CHANGELOG.md`).
      Group into one product the things that a document, a check or a workflow keeps at one version. Show the proposed table. Under it, say for each cell which file or command it comes from. A cell with no evidence holds `<ask>`. Ask "Write this table into `<release document>`?" and wait.
      - Yes: add the section `Products` to the release document. Create `docs/releasing.md` when the project has no release document. This is a change of a file of the repository: `agent/rules/git-safety.md` says where it is made (a ticket's worktree when the main checkout is protected). Do not commit it in this skill.
      - No: use the proposed table for this run only, and say so in the report.
   3. **One product:** use it. Do not ask.
   4. **More than one product:** when the input names one, use it. Otherwise run the commands of the cell "Last released version" of each product, then ask one question and wait: "Which product do you release?", with one line per product: its name and its last released version.
2. **Find the last release** of the product, from the real sources. A document is not a source.
   - `git fetch origin --tags`. Then run each command of the cell "Last released version". For a tag, the version is the tag name without the fixed text of the pattern: `v1.2.0` with the pattern `v<version>` is `1.2.0`.
   - Also run `gh release list --limit 5`, and search Linear for the last release ticket of the product.
   - When the sources give different versions, the last release is the highest one. Keep each answer: step 4 reports the difference.
   - The commit of the last release is the tag of that version. With no tag: `npm view <package>@<version> gitHead` prints the commit of a package that was published from git. If you cannot find a last release, ask: "Which commit or tag was the last release of `<product>`?" and wait. A product that was never released has no last release: say so, and use the first commit of its paths.
3. **Decide the version.** Use the version the person gave. Otherwise read the main version file on the branch being released (`git show origin/<branch being released>:<path>`): when its version is higher than the last release, that is the new version. Otherwise propose the next one in the pattern of the earlier versions and confirm it in step 8. If a release ticket for this product and version is already open, update it. Never create a second one. When the version the person gave is the last released version and its release ticket exists, the release already happened: go to step 12.
4. **Check the product's version.** Do the 6 checks before any later step. Read the files on the branch being released, not in the current folder: `git show origin/<branch being released>:<path>`. When the current folder is a worktree whose branch changes a version file or the changes file, also say what that branch holds: the release can start only after that branch is merged. Compare versions number by number: `0.1.10` is higher than `0.1.9`. Write for each check: the command, what it printed, and `pass`, `fail` or `not verified`.
   1. **The version written in the repository:** the value of each file of the cell "Version files".
   2. **The last released version:** the answers of step 2. `fail` when two sources differ: one release is not complete. Name the source that is behind.
   3. **The new version is higher** than the last released version, and is not used yet: `git ls-remote --tags origin <tag of the new version>` prints nothing, and `npm view <package>@<new version> version` prints nothing or `404`, for each tag pattern and each package of the cell "Released by".
   4. **Every version file agrees:** each file of check 1 holds the new version. Name each file that holds another value.
   5. **The changes file exists,** when the cell "Changes file" is not `none`: `git cat-file -e origin/<branch being released>:<path>` for a path with `<version>`; for a file with no `<version>` in its path, `git show origin/<branch being released>:<path> | grep -nF '<new version>'` prints a line.
   6. **The release workflow exists,** when the cell "Workflow" is not `none`: `git cat-file -e origin/<branch being released>:<path>`. Read its block `on:`. List what starts it and each input: name, required or not, default, and the value it gets for this release.
   A check that fails is a **blocking** risk in step 7, with the exact file and the fix: the text to write, or the command to run. A check that is `not verified` is listed with the reason. This skill does not correct the files: the correction is a change in a ticket's worktree.
5. **Find the release pull request.** The release document says how the product is released. If it does not say, ask: "How is `<product>` released: a tag on `<base_branch>`, a workflow that a person starts, or a pull request from one branch into another?" and wait.
   - Release by pull request: `gh pr list --state open --base <release target>`. If none is open, say so. Do not create it unless the person asks.
   - Release by tag or by workflow: there is no release pull request. Step 10 writes release notes with the same content.
6. **List what is in the release.** Only the changes of the chosen product: a change belongs to the product when it touches one of its paths (the cell "Paths").
   - `git log --oneline <last release>..origin/<branch being released> -- <paths of the product>`. With `all`, leave out `-- <paths>`.
   - When the first command prints nothing, nothing was merged since the last release. Report "Nothing to release for `<product>` since `<last release>`.", with the result of step 4, and stop. Create no ticket.
   - `gh pr list --base <base_branch> --state merged --search "merged:>=<date and time of the last release>" --json number,title,body,headRefName,mergedAt,url,files`. The date and time: `git log -1 --format=%cI <last release>`.
   - Keep a pull request that changed one file or more under the paths of the product. A pull request that changed no such file is a change of another product: list it under "Left out: changes of other products" with the product that owns its files, or "no product". When no pull request is left out, write "none".
   - Leave out a pull request whose change is already released: none of its files differ between the last release and the branch being released (`git diff --name-only`).
   - Take the ticket ids (`<PREFIX>-<n>`) from titles, bodies, branch names and commit messages. Read each ticket in Linear: title, status, parent ticket. A parent ticket is listed with the sub-tickets that are in the diff.
   - A pull request with no ticket is listed as "no ticket". Anything without evidence in git or GitHub becomes a question in the draft.
7. **Find the risks.** First, each failed check of step 4, as a blocking risk. Then read the diff between the last release and the branch being released, for the paths of the product. Read, do not only list:
   - each database migration: what it creates, what it removes or changes, whether it can be undone, and whether the earlier code still runs after it;
   - new settings and environment variables (compare `.env.example`);
   - behaviour a person will see change; data that must be created after the deploy;
   - the checks of the release pull request: `gh pr checks <number>`. With no release pull request, the checks of the newest commit of the branch being released: `gh run list --commit <commit>`. When that commit is the merge of a pull request and has no run of its own, the checks of that pull request: `gh pr checks <number>`. A failing or missing check is a **blocking** risk.
   Write each risk with five parts: what it is; what breaks and who notices; how to know (a command or a URL); what to do before the release; what to do if it happens. Write the rollback as ordered steps. If the documentation does not say how to roll back, write "rollback: not documented" as a blocking risk.
8. **Show the draft and wait.** The product; the version; the 6 checks of step 4 as a table (check, result, evidence); the release pull request, or "none"; a table of tickets (id, title, status, pull request); pull requests with no ticket; pull requests left out as already released; left out: changes of other products; risks, the blocking ones first; the step a person does to release, as the release document names it, with the value of each workflow input; actions before and after the release; questions. Ask "Create the release ticket with this content?" and wait for the answer.
9. **Create the release ticket** in Linear after the yes. Title: `Release <version>`; with more than one product in the table, `Release <product> <version>`. Description: the draft of step 8, with a checklist to verify after the release. Link every ticket of the table as related, and link the release pull request. Then create `local-docs/notes/<PREFIX>-<n>/` for the release ticket.
10. **Write the pull request text.** Save `release-pr.md` in that folder: the title of the release ticket and the body. The body says what changes for the people who use the product, then lists the tickets and pull requests, the risks, the actions before and after the release, and the link to the release ticket. Use the profile's `output_language`.
    - Do not apply it to GitHub unless the profile's `external_writes` lists editing a pull request, or the person says yes. The command is `gh pr edit <number> --title "<title>" --body-file <path>`.
11. **Record.** Set the release ticket's status to the one that means "in review". Add an entry at the top of `log.md` in the same folder: date, product, version, last release, the result of the 6 checks, number of tickets and pull requests, blocking risks.
12. **After the release**, when the person runs the skill again for the same product and version: run the commands of the cell "Last released version" again. Each must print the new version. Confirm the release with the checklist of the release ticket, report what you could not verify, and draft the comment "Released in <product> <version>" for each included ticket. Ask before posting the comments and before closing the release ticket.

## Output

A fixed report:

- **Done:** the product and the version; the result of each of the 6 checks; the release ticket's link; the path of `release-pr.md`; the release pull request URL, or "none open"; totals (tickets, pull requests, pull requests with no ticket); each blocking risk in one line.
- **Not done:** nothing was published, tagged or merged; whether the table "Products" was written; whether the text was applied to the pull request; tickets you could not read; checks you could not run; questions with no answer.
- **Next step:** the one step that the person does to release, named as the release document names it: the pull request to review and merge, or the workflow to start with the value of each input. With a blocking risk: the correction comes first. Then `/release <product> <version>` again for the checks after the release.

## Do not

- Do not merge, push, tag, publish, deploy, start a workflow, create a branch or turn on auto-merge. Name the step and let the person do it.
- Do not name a product that is not in the table "Products", and do not release two products in one run.
- Do not take the last released version from a document or from memory. Run the command.
- Do not invent tickets, versions, risks or test results.
- Do not create a second release ticket for the same product and version.
- Do not change the status of the included tickets.
- Do not change anything in a production environment. Report what you find and ask.
- Do not write a risk without saying what to do about it.

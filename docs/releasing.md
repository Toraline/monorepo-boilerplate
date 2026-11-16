# How to release the boilerplate

The steps to release a new version of the boilerplate. The boilerplate lives in two repositories on GitHub. The work happens in the development repository. A release is sent to the public repository as one pull request. When a person merges that pull request, the public repository creates the git tag of the version and publishes the two packages `create-toraline-monorepo` and `update-toraline-monorepo` to npm.

A person does the release. An agent may do steps 1 to 4 of "Steps of a release" when asked. An agent never starts the workflow "Release", never merges the release pull request, and never handles a token or a login.

## Context you need before reading

- **Boilerplate**: the files of this repository: the template, the way of working with agents, and the two npm commands.
- **Development repository**: `Toraline/monorepo-boilerplate-dev` on GitHub. It is private. It holds the whole history, the tickets' branches and the pull requests of the daily work.
- **Public repository**: `Toraline/monorepo-boilerplate` on GitHub. It holds one commit per release, the release tags, and nothing of the private history. The two npm commands download the boilerplate from it.
- **Public copy**: the files of one commit of the development repository that go into the public repository: every file that git tracks, without the files of the list `boilerplate/public/private-files.txt`, with the files of the folder `boilerplate/public/overlay/`.
- **npm registry**: the public server at https://www.npmjs.com that stores packages. `npx <name>` downloads a package from it and runs it.
- **Publish**: send one version of a package to the registry. A published version can never be changed.
- **The two packages**: `create-toraline-monorepo` and `update-toraline-monorepo`, in the folder `cli/`. They always have the version of the boilerplate and are always published together.
- **Version**: the three numbers in the file `boilerplate/VERSION`, for example `0.1.2` ([boilerplate-version.md](boilerplate-version.md)).
- **Git tag**: a name that points to one commit. The tag of a release is `v` plus the version: `v0.1.2`. It exists in the public repository. The commands download the boilerplate at the newest tag of this form.
- **Updates file**: `boilerplate/updates/<version>.json`. It lists what a monorepo can take from the release.
- **Workflow**: a list of steps that GitHub runs on its own machines.
- **Repository secret**: a value saved in the settings of one repository on GitHub. A workflow of that repository can use it, and nobody can read it back.
- **Ruleset**: a rule in the settings of a repository on GitHub that says what may happen to a branch or to a tag.
- **Provenance**: a signed note that npm shows for a package. It names the public repository, the workflow and the commit that built the package.
- **Product**: one thing that a repository releases by itself, with its own version. The skill `/release` reads the products of a repository from the table "Products" below.

## The two repositories

| | Development repository | Public repository |
|---|---|---|
| Name | `Toraline/monorepo-boilerplate-dev` | `Toraline/monorepo-boilerplate` |
| Who sees it | The owner | Everyone |
| History | Every commit | One commit per release, with the message `release: v<version>` |
| Pull requests | One per ticket, to `main` | One per release, with the title `Release v<version>`, to `main` |
| Tags `v<version>` | Only `v0.1.0`, `v0.1.1` and `v0.1.2`, from the time before the public repository. No new tag is created here | One per release. The workflow "Publish" creates it |
| Workflow that checks | "Check" (`.github/workflows/check.yml`): each pull request to `main` | "Check" (the same check): each pull request to `main` and each push to `main` |
| Workflow that releases | "Release" (`.github/workflows/release.yml`): a person starts it with a version. It opens the release pull request in the public repository | "Publish" (`.github/workflows/publish.yml`): it runs when the release pull request is merged. It creates the tag and publishes to npm |
| Secrets | `PUBLIC_REPO_TOKEN`; optional: `PRIVATE_NAMES` | `NPM_PUBLISH_TOKEN` |

What decides which files are public, in the folder `boilerplate/public/`:

| File | What it is |
|---|---|
| `make-public-copy.sh` | The script that writes the public copy of a commit into a folder. It ends with an error when the copy holds a secret or a private name |
| `private-files.txt` | The list of the paths that stay private. Today: `.github/workflows/release.yml` and `local-docs` |
| `overlay/` | The files that only the public repository has. Each is written to the same path from the root folder. Today: `.github/workflows/check.yml` and `.github/workflows/publish.yml` |
| `push-release.sh` | The script that sends a public copy to the public repository as one commit on the branch `release/v<version>`, and opens the pull request |
| `release-text.mjs` | The script that writes the message of the release commit and the body of the release pull request, from the updates file |

These 5 are also part of the public copy. They hold no secret and no private name, and the tests of the two commands need them: a test creates a monorepo from the public copy, as the published commands do.

To see the public copy of a commit on your machine, before any release:

```bash
make public-copy OUT=/tmp/public-copy REF=origin/main
```

The folder must not exist yet and must be outside the repository. On your machine the script also checks the copy for the private names of `local-docs/private-names.txt`.

## Products

This repository has one product. The skill `/release` reads this table and checks the version of the product before it lists what is in a release. What each column holds: the section "The table "Products"" of [agent/skills/release/SKILL.md](../agent/skills/release/SKILL.md).

| Product | Version files | Released by | Last released version | Paths | Changes file | Workflow |
|---|---|---|---|---|---|---|
| `boilerplate` | `boilerplate/VERSION`, `cli/create-toraline-monorepo/package.json`, `cli/update-toraline-monorepo/package.json`, `cli/package-lock.json` (key `packages` > `create-toraline-monorepo` > `version`, and key `packages` > `update-toraline-monorepo` > `version`) | tag `v<version>` in the public repository `Toraline/monorepo-boilerplate`; npm `create-toraline-monorepo`; npm `update-toraline-monorepo` | `git ls-remote --tags --refs --sort=-v:refname https://github.com/Toraline/monorepo-boilerplate.git 'v*'`; `npm view create-toraline-monorepo version`; `npm view update-toraline-monorepo version` | `all` | `boilerplate/updates/<version>.json` | `.github/workflows/release.yml` |

How to read the cells of this row:

- **The last released version is read from the public repository and from npm, never from the tags of the development repository.** The first command prints one line per tag, the newest first, in the form `<commit id> refs/tags/v0.1.2`. The tag is the text after `refs/tags/`.
- A new tag is checked in the public repository too: `git ls-remote --tags https://github.com/Toraline/monorepo-boilerplate.git v<version>` prints nothing when the version is not used yet.
- The workflow of the cell "Workflow" is the one that a person starts, in the development repository. It has one input, `version`. It does not publish: the next step for the person is the pull request `Release v<version>` in the public repository.
- **The commit of a release in the development repository.** For `0.1.0`, `0.1.1` and `0.1.2`: the tags `v0.1.0`, `v0.1.1` and `v0.1.2` of the development repository. For a later release: the message of the release commit in the public repository ends with the line `Development commit: <commit id>`. This prints the message: `gh api repos/Toraline/monorepo-boilerplate/commits/v<version> --jq .commit.message`

Why one product and not three: the template and the two packages cannot be released alone. One version gives one release pull request, one tag and both packages, and `make check` fails when the 3 versions differ. A published command downloads the template at the newest tag, so a package with a version that has no tag would not work.

`agent/CORE_VERSION` is not a product: nothing is released under that number alone. It reaches a monorepo inside a release of the boilerplate ([boilerplate-version.md](boilerplate-version.md)).

## One-time setup

Only the owner can do it. Do the 6 parts in this order. Parts A and B make the public repository usable: after them the published commands work. Parts C to F are needed before the first release through the workflows.

Never write a token into a file, a ticket or a chat.

### A. Put the first three releases into the public repository

The public repository starts with 3 commits: the files of release `0.1.0`, of release `0.1.1` and of release `0.1.2`, each with its tag. These 3 releases were published from the development repository, before the public repository had a commit. They were prepared as a local git repository, the seed. It has the branch `main`, the tags `v0.1.0`, `v0.1.1` and `v0.1.2`, and no remote.

1. Open a terminal in the folder of the seed.
2. Check what you are about to send. This must print 3 lines: `release: v0.1.2`, `release: v0.1.1` and `release: v0.1.0`:

   ```bash
   git log --format=%s main
   ```

3. Send the branch and the 3 tags:

   ```bash
   git push git@github.com:Toraline/monorepo-boilerplate.git main v0.1.0 v0.1.1 v0.1.2
   ```

4. Check: this prints 3 lines. They end with `refs/tags/v0.1.0`, `refs/tags/v0.1.1` and `refs/tags/v0.1.2`. While the repository is private, the command needs your login.

   ```bash
   git ls-remote --tags https://github.com/Toraline/monorepo-boilerplate.git
   ```

### B. Make the public repository public

1. On GitHub open `Toraline/monorepo-boilerplate` > **Settings** > **General** > **Danger Zone** > **Change repository visibility** > **Change to public**.
2. Check, in an empty folder: `npx create-toraline-monorepo --version` prints a version, and `npx create-toraline-monorepo my-test --yes` creates a monorepo. Then, inside `my-test`: `npx update-toraline-monorepo --check` prints that no update exists.
3. [SECURITY.md](../SECURITY.md) sends a reporter to the form "Report a vulnerability". Turn it on: **Settings** > **Advanced Security** > **Private vulnerability reporting** > **Enable**.

The workflow "Publish" needs a public repository: npm signs the provenance of a package only when the repository that builds it is public.

### C. The rule for the branch `main` of the public repository

Do it after part A: the rule refuses a direct push to `main`, and part A is a direct push.

1. In a terminal, in a checkout of the development repository:

   ```bash
   bash scripts/protect-main.sh --repo Toraline/monorepo-boilerplate
   ```

2. It prints the rule and asks. Type `yes`. It creates one ruleset with the name `protect-main`: a change of `main` needs a pull request (no approval is required), the check `check` must pass before the merge, no force push, and the branch cannot be deleted.
3. Check: https://github.com/Toraline/monorepo-boilerplate/settings/rules shows `protect-main` as **Active**.

The same command with no `--repo` protects `main` of the development repository.

### D. The rule for the release tags of the public repository

A release tag must never move and never disappear: monorepos compare their files with it.

1. Run this command. It needs the `gh` command, logged in as an admin of the repository.

   ```bash
   gh api --method POST repos/Toraline/monorepo-boilerplate/rulesets --input - <<'JSON'
   {
     "name": "protect-release-tags",
     "target": "tag",
     "enforcement": "active",
     "conditions": { "ref_name": { "include": ["refs/tags/v*"], "exclude": [] } },
     "rules": [ { "type": "update" }, { "type": "deletion" } ]
   }
   JSON
   ```

   The same with buttons: **Settings** > **Rules** > **Rulesets** > **New ruleset** > **New tag ruleset**. Name: `protect-release-tags`. Enforcement status: **Active**. Target tags > **Add target** > **Include by pattern** > `v*`. Turn on **Restrict updates** and **Restrict deletions**. Leave **Restrict creations** off. Press **Create**.

2. Check: https://github.com/Toraline/monorepo-boilerplate/settings/rules shows `protect-release-tags` as **Active**.

How the workflow "Publish" is still allowed to create the tag: the ruleset forbids changing and deleting a tag `v*`, and it does not forbid creating one. The job "create the tag" of the workflow has the permission `contents: write`, which lets it create a tag. Nobody is on the bypass list, so nobody can move or delete a release tag, also not the owner. What the ruleset does not stop: a person with write access to the public repository can create a new tag `v*` by hand. Do not do that: the commands would download the boilerplate at that tag.

### E. The secret `NPM_PUBLISH_TOKEN`, in the public repository

1. Sign in on https://www.npmjs.com with the account that owns the two packages.
2. Create an access token: your picture > **Access Tokens** > **Generate New Token** > **Granular Access Token**. Give it **Read and write** permission for 2 packages only: `create-toraline-monorepo` and `update-toraline-monorepo`. Do not choose "All packages": a token that leaks could then publish every package of the account. Give it an end date. Copy the token. npm shows it once.
3. On GitHub open `Toraline/monorepo-boilerplate` > **Settings** > **Secrets and variables** > **Actions** > **New repository secret**.
4. Name: `NPM_PUBLISH_TOKEN`. Secret: paste the token. Press **Add secret**.
5. The development repository has a secret with the same name from the first three releases. No workflow there uses it now. Delete it: `Toraline/monorepo-boilerplate-dev` > **Settings** > **Secrets and variables** > **Actions** > `NPM_PUBLISH_TOKEN` > **Remove**. Then delete the old token on npmjs.com, so that only the new token of step 2 can publish.

When the token ends, the workflow "Publish" stops at the step "Stop when the npm token is missing" or at "Publish the two packages". Repeat steps 2 to 4, then see "When a step fails".

### F. The secret `PUBLIC_REPO_TOKEN`, in the development repository

The workflow "Release" runs in the development repository and writes to the public repository. The token of a run can write only to its own repository, so the workflow needs a token of a person.

1. On GitHub: your picture > **Settings** > **Developer settings** > **Personal access tokens** > **Fine-grained tokens** > **Generate new token**.
2. **Resource owner**: `Toraline`. **Repository access**: **Only select repositories** > `Toraline/monorepo-boilerplate`. Choose no other repository.
3. **Repository permissions**, 3 of them. Leave every other permission at **No access**:

   | Permission | Value | Why |
   |---|---|---|
   | Contents | Read and write | To push the branch `release/v<version>` |
   | Pull requests | Read and write | To open the pull request `Release v<version>` |
   | Workflows | Read and write | A release holds the files of `.github/workflows/`. GitHub refuses a push that adds or changes such a file without this permission |

   GitHub adds **Metadata: Read-only** by itself.
4. Give it an end date. Press **Generate token**. Copy the token. GitHub shows it once.
5. Open `Toraline/monorepo-boilerplate-dev` > **Settings** > **Secrets and variables** > **Actions** > **New repository secret**. Name: `PUBLIC_REPO_TOKEN`. Secret: paste the token. Press **Add secret**.

Optional, in the same place: a secret with the name `PRIVATE_NAMES`. Its value is the lines of your file `local-docs/private-names.txt`. With it, the workflow "Release" also checks the public copy for the private names. Without it, the workflow checks only for secrets, and prints a warning. In both cases you read the files of the release pull request before you merge it.

Not verified: the exact names of the buttons on github.com and on npmjs.com, how long each lets a token live, and whether the organization `Toraline` asks for an approval of a fine-grained token (**Organization settings** > **Personal access tokens**). The commands of parts C and D were not run against GitHub.

## Steps of a release

The examples use `0.2.0` as the new version.

1. **Choose the version.**

   | What changed | Example |
   |---|---|
   | A fix, or new updates that break no monorepo | `0.1.1` becomes `0.1.2` |
   | A change that a monorepo must act on, or a change of the format of the record file, of the updates files or of the manifest | `0.1.2` becomes `0.2.0` |

2. **Start a ticket and its worktree** in the development repository, as for any change (`make worktree TICKET=<n> SLUG=release-<version>`). Step 3 happens there.

3. **Write the version and the updates file.**
   1. Write the new version into `boilerplate/VERSION`.
   2. Write the same version into `"version"` of `cli/create-toraline-monorepo/package.json` and of `cli/update-toraline-monorepo/package.json`. Then run `npm install --package-lock-only` in the folder `cli`, so that `cli/package-lock.json` has the new version.
   3. Create `boilerplate/updates/0.2.0.json`: one update for each thing that a monorepo can take from this release. The format and an example: [boilerplate-version.md](boilerplate-version.md). The key `coreVersion` is the value of `agent/CORE_VERSION`. The key `date` is the day of the release: correct it when the release happens on a later day. The titles of the updates become public: they are the message of the release commit and the table of the release pull request. Never change the updates file of a version that is already published.
   4. Run `make check`. It must end with `Check passed.` It fails when the version file, the newest updates file and the versions of the two packages do not agree, and when a package would hold a file that it must not hold.

4. **Commit, open the pull request to `main` of the development repository, and merge it** after `check` passes on GitHub. From here on the branch `main` has the version.

5. **Start the workflow "Release". A person does this step, never an agent.**
   1. On GitHub open `Toraline/monorepo-boilerplate-dev` > **Actions** > **Release** > **Run workflow**.
   2. **Use workflow from**: choose the branch `main`.
   3. **version**: type the version, for example `0.2.0`. Press **Run workflow**.
   4. Wait for the green check mark. The run stops before it writes anything when the version is not the version of the files, when the public repository already has that version or a higher one, or when npm already has that version. Then it runs `make check`, makes the public copy, pushes the branch `release/v0.2.0` to the public repository as one commit, and opens the pull request `Release v0.2.0` there. The last lines of its last step hold the address of the pull request.
   5. It created no tag and published nothing.

6. **Review and merge the release pull request. A person does this step.**
   1. Open the pull request `Release v0.2.0` in `Toraline/monorepo-boilerplate`.
   2. Wait until its check `check` is green.
   3. Read the tab **Files changed**. Everything in it becomes public. The body of the pull request lists the updates of the release.
   4. Press **Merge pull request**. Any of the 3 ways to merge works.

7. **Wait for the workflow "Publish".** It starts by itself when the pull request is merged: `Toraline/monorepo-boilerplate` > **Actions** > **Publish**. Its 4 jobs, in order:
   1. "decide": it reads `boilerplate/VERSION`. The tag `v0.2.0` does not exist, so this commit is a release.
   2. "check the commands": it lints, tests and builds the two commands.
   3. "create the tag": it creates the tag `v0.2.0` on the new commit of `main`.
   4. "publish to npm": it publishes the two packages, with provenance, and waits until npm shows them.

   For any other push to `main`, the tag of the version already exists on an older commit, and the workflow stops after "decide" with the line `Nothing to publish.`

8. **Check the result.** In a terminal, anywhere:

   ```bash
   git ls-remote --tags https://github.com/Toraline/monorepo-boilerplate.git v0.2.0
   npm view create-toraline-monorepo@0.2.0 version
   npm view update-toraline-monorepo@0.2.0 version
   npm view create-toraline-monorepo dist-tags
   ```

   - The first command prints one line that ends with `refs/tags/v0.2.0`.
   - npm needs some minutes after a publish. Until then the second and third commands answer `404 Not Found`. They then print the version. `dist-tags` shows `latest: '0.2.0'`.

   Then try the commands: `npx create-toraline-monorepo --version` prints the version, and `npx create-toraline-monorepo my-test --yes` in an empty folder creates a monorepo. In a monorepo that was created from the version before: `npx update-toraline-monorepo --check` lists the updates of the release.

9. **Update the repositories that use the boilerplate.** The owner keeps their list outside this repository ([repositories.md](repositories.md) says why and what it holds). In each of them a person or an agent runs `npx update-toraline-monorepo`.

## When a step fails

Each row names the step, what you see, and what to do. A release is finished only when step 8 passes.

| Where | What you see | What to do |
|---|---|---|
| Step 5, "Stop when the token of the public repository is missing" | `The repository secret PUBLIC_REPO_TOKEN is missing or empty` | Part F of the one-time setup. Then start the workflow "Release" again |
| Step 5, "Stop when the version is already released" | `could not be read with the secret PUBLIC_REPO_TOKEN` | The token ended, or it has no access to the public repository. Create a new one (part F). Start again |
| Step 5, "Stop when the version is already released" | `Version 0.2.0 is not higher`, or `is already on npm` | The version was used. Raise it (steps 1 to 4). Start again with the new version |
| Step 5, "Check" | A test or a check fails | Correct it in a pull request to `main` of the development repository. Start again |
| Step 5, "Make the public copy" | `must NOT be published`, and lines that start with `Refused:` | Each line names a file that holds a secret or a private name. Correct the file in a pull request to `main` of the development repository. When the whole file must stay private, add its path to `boilerplate/public/private-files.txt`. Start again |
| Step 5, last step | `The public repository has no branch main` | Part A of the one-time setup |
| Step 5, last step | `refusing to allow a Personal Access Token to create or update workflow` | The token has no permission **Workflows**. Create a new one with the 3 permissions of part F. Start again |
| Step 5, last step | `The branch release/v0.2.0 already exists in the public repository with other files` | An earlier run pushed the branch, and `main` of one of the two repositories changed since. Close the pull request `Release v0.2.0` in the public repository. Delete the branch: the button **Delete branch** on the closed pull request, or `git push git@github.com:Toraline/monorepo-boilerplate.git --delete release/v0.2.0`. Start again |
| Step 5, last step | The run failed after the line `Pushed the branch`, and no pull request exists | Start the workflow again with the same version. It prints `already exists in the public repository with the same files. Kept.` and opens the pull request |
| Step 6 | The check `check` of the release pull request fails | Do not merge. Correct the cause in the development repository. Then close the pull request, delete the branch as in the row above, and start the workflow "Release" again |
| Step 7, "decide" | `which has no tag and is lower than the last release` | `boilerplate/VERSION` on `main` of the public repository holds an old version. Release a higher version |
| Step 7, "create the tag" | `The repository secret NPM_PUBLISH_TOKEN is missing or empty` | Part E of the one-time setup. Then open the failed run > **Re-run all jobs**. No tag was created yet |
| Step 7, "publish to npm" | The tag `v0.2.0` exists, and one package or both are not on npm (for example the npm token ended) | Correct the cause (part E). Open the failed run > **Re-run all jobs**. The run sees that the tag is on the same commit and that a package is missing: it keeps the tag, skips a package that is already on npm, and publishes the rest |
| Step 7, "publish to npm" | An error of npm about provenance | The public repository is not public (part B), or the address in `"repository"` of a `package.json` in `cli/` is not the address of `Toraline/monorepo-boilerplate`. Correct it, then **Re-run all jobs** |
| Step 7 | The workflow "Publish" did not start after the merge | Open **Actions** > **Publish**. When no run exists for the merge: the pull request was merged into another branch than `main`, or Actions is turned off in the settings of the public repository |

Never delete or move a tag `v<version>`, and never create one by hand. Never run `npm publish` on your machine: a package that is published from a machine has no provenance, and its files can differ from the tag.

## How to undo a wrong release

A published version cannot be changed, and its number cannot be used again, even after it is removed. A release tag is never moved.

1. **The normal correction: release a new version** (`0.2.1`) with the steps above.
2. **Warn about the wrong version** (a person with npm access runs this):

   ```bash
   npm deprecate create-toraline-monorepo@0.2.0 "Broken: use 0.2.1"
   npm deprecate update-toraline-monorepo@0.2.0 "Broken: use 0.2.1"
   ```

   The version stays on npm. Everyone who runs it sees the message.
3. **When the template of the release is broken** (a new monorepo does not pass `make check`): the commands use the newest tag, so the new release of point 1 corrects it. Do not delete the old tag: monorepos that were created from it compare their files with it.
4. **When a private name or a secret reached the public repository:** a secret is no longer secret, so replace it at its service first. Then the owner decides whether the history of the public repository is rewritten. That is not a step of this document, and an agent never does it.

The rules of npm for removing a version (`npm unpublish`): https://docs.npmjs.com/policies/unpublish. Use it only for a version that has a secret inside.

## What the workflows do not do

- The workflow "Release" does not run the end-to-end tests (`make e2e`). The pull request of step 4 ran them, and the release pull request of step 6 runs them again in the public repository.
- The workflow "Publish" does not run the whole `make check`, only the checks of `cli/`. The ruleset of `main` requires the whole check on the release pull request before the merge.
- No workflow creates a "Release" on the GitHub page, only the git tag.
- No workflow creates a tag in the development repository. The line `Development commit:` in the message of each release commit says which commit of the development repository a release is.
- A pull request from another person to the public repository is never merged there: the next release would remove its change. [CONTRIBUTING.md](../CONTRIBUTING.md) says what happens with it.

## Status

- **Done:** the scripts in `boilerplate/public/` and their tests (`cli/shared/src/public-copy.test.ts`), the workflow "Release", the workflows "Check" and "Publish" of the public repository, `scripts/protect-main.sh` and its tests (`cli/shared/src/protect-main.test.ts`), this document. The YAML of the 3 workflow files was parsed, and their steps were read one by one.
- **Done:** releases `0.1.0`, `0.1.1` and `0.1.2`, on 2026-11-16, with the first release workflow, from the repository that is now the development repository: both packages are on npm with those versions, and the 3 tags exist in the development repository.
- **Done on 2026-11-16, on one machine:** the seed of the public repository (3 commits, 3 tags) was built, and the published commands `0.1.0`, `0.1.1` and `0.1.2` created a monorepo from it. The flow was tried without GitHub: the public copy of the files of this change was sent into a copy of the seed with `make-public-copy.sh` and `push-release.sh`, and the commands built from this change created a monorepo from that copy and updated one from `0.1.1`. [decisions.md](decisions.md) has the results.
- **Not done:** the one-time setup, parts A to F. Until part A is done, the public repository is empty, and the published commands stop with `The boilerplate could not be read` or `has no release tag`.
- **Done:** version `0.1.3` is prepared in the files and not published. `0.1.2` was published on 2026-11-16, while this flow was written, from the commit before this flow. So the changes of this flow are in `0.1.3`: `boilerplate/VERSION` and the 2 packages say `0.1.3`, `agent/CORE_VERSION` says `0.1.11`, and `boilerplate/updates/0.1.3.json` holds 3 updates: `0.1.3-core`, `0.1.3-protect-main` and `0.1.3-protect-main-target`. `boilerplate/updates/0.1.2.json` is exactly the file of the tag `v0.1.2`.
- **Not verified:** no workflow of this document has run on GitHub. The first run of "Release" and of "Publish" is the next release. The names of the buttons on github.com and npmjs.com.
- **On 2026-11-16:** `0.1.0`, `0.1.1` and `0.1.2` are published on npm. `0.1.2` is the last released version. `0.1.3` is prepared in the files and not published.
- **How to see which version is published:** `npm view create-toraline-monorepo version` prints the newest version on npm, and `git ls-remote --tags https://github.com/Toraline/monorepo-boilerplate.git` prints the release tags. The file `boilerplate/VERSION` on the branch `main` of the development repository holds the version of the files. When it is higher than the published version, the version of the file is prepared and not published.
- **What you must do:** the one-time setup, once. Then, for each release, steps 1 to 9. For a version that is already prepared in the files, start at step 4: today that is `0.1.3`.

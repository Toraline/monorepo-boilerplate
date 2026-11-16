# How to release the boilerplate

The steps to release a new version of the boilerplate: publish the two packages `create-toraline-monorepo` and `update-toraline-monorepo` to npm, and create the git tag of the version. A person does them. An agent may do steps 1 to 4 when asked. An agent never does step 5, and never handles an npm token or a login.

## Context you need before reading

- **Boilerplate**: this repository, `Toraline/monorepo-boilerplate`.
- **npm registry**: the public server at https://www.npmjs.com that stores packages. `npx <name>` downloads a package from it and runs it.
- **Publish**: send one version of a package to the registry. A published version can never be changed.
- **The two packages**: `create-toraline-monorepo` and `update-toraline-monorepo`, in the folder `cli/`. They always have the version of the boilerplate and are always published together.
- **Version**: the three numbers in the file `boilerplate/VERSION`, for example `0.1.0` ([boilerplate-version.md](boilerplate-version.md)).
- **Git tag**: a name that points to one commit. The tag of a release is `v` plus the version: `v0.1.0`. The commands download the boilerplate at the newest tag of this form.
- **Updates file**: `boilerplate/updates/<version>.json`. It lists what a monorepo can take from the release.
- **Workflow**: a list of steps that GitHub runs on its own machines. The release workflow is `.github/workflows/release.yml`, shown on GitHub as "Release".
- **Repository secret**: a value saved in the settings of the repository on GitHub. A workflow can use it, and nobody can read it back.
- **npm access token**: a password-like value, made on npmjs.com, that lets a workflow publish for an npm account.

## One-time setup

Do this once, before the first release. Only a person with the npm account that will own the two packages can do it.

1. Sign in on https://www.npmjs.com with that account.
2. Create an access token: your picture > **Access Tokens** > **Generate New Token** > **Granular Access Token**. Give it **Read and write** permission for packages. For the first release the two packages do not exist yet, so the token must be allowed to create packages ("All packages"). Copy the token. npm shows it once.
3. On GitHub, open the repository `Toraline/monorepo-boilerplate` > **Settings** > **Secrets and variables** > **Actions** > **New repository secret**.
4. Name: `NPM_PUBLISH_TOKEN`. Secret: paste the token. Press **Add secret**.

Not verified: the exact names of the buttons on npmjs.com, and how long npm lets a token live. When the token ends, the workflow fails at the step "Publish the two packages", and you repeat steps 2 to 4.

Never write the token into a file, a ticket or a chat.

## Steps of a release

The examples use `0.2.0` as the new version.

1. **Choose the version.**

   | What changed | Example |
   |---|---|
   | A fix, or new updates that break no monorepo | `0.1.0` becomes `0.1.1` |
   | A change that a monorepo must act on, or a change of the format of the record file, of the updates files or of the manifest | `0.1.1` becomes `0.2.0` |

   The first release needs no new number: the files already say `0.1.0`. Skip steps 2 and 3 for it, and check only that the key `date` of `boilerplate/updates/0.1.0.json` is the day of the release.

2. **Start a ticket and its worktree**, as for any change (`make worktree TICKET=<n> SLUG=release-<version>`). Step 3 happens there.

3. **Write the version and the updates file.**
   1. Write the new version into `boilerplate/VERSION`.
   2. Write the same version into `"version"` of `cli/create-toraline-monorepo/package.json` and of `cli/update-toraline-monorepo/package.json`. Then run `npm install --package-lock-only` in the folder `cli`, so that `cli/package-lock.json` has the new version.
   3. Create `boilerplate/updates/0.2.0.json`: one update for each thing that a monorepo can take from this release. The format and an example: [boilerplate-version.md](boilerplate-version.md). The key `coreVersion` is the value of `agent/CORE_VERSION`.
   4. Run `make check`. It must end with `Check passed.` It fails when the version file, the newest updates file and the versions of the two packages do not agree, and when a package would hold a file that it must not hold. Near the end it prints the files of each package: each has exactly `README.md`, `dist/index.js` and `package.json`.

4. **Commit, open the pull request to `main`, and merge it** after `check` passes on GitHub. From here on the branch `main` has the version.

5. **Release. A person does this step, never an agent.**
   1. On GitHub open **Actions** > **Release** > **Run workflow**.
   2. **Use workflow from**: choose the branch `main`.
   3. **version**: type the version, for example `0.2.0`.
   4. Leave the box **publish** off. Press **Run workflow**. This is the test run: it builds, tests and packs the two packages, and publishes nothing. Wait for the green check mark. Its step "Pack the two packages" lists the files of each package; its step "Say what a real run would do" names the tag and the packages.
   5. Run the workflow again with the same values and the box **publish** on. It creates the git tag `v0.2.0` on the commit of `main`, then publishes the two packages.

   When a run fails after the tag was created, or after one package was published: correct the cause and run it again with the same version and the box on. It keeps a tag that is already on the same commit, and it skips a package whose version is already on npm.

6. **Check the result.** In a terminal, anywhere:

   ```bash
   npm view create-toraline-monorepo@0.2.0 version
   npm view update-toraline-monorepo@0.2.0 version
   npm view create-toraline-monorepo dist-tags
   git ls-remote --tags git@github.com:Toraline/monorepo-boilerplate.git v0.2.0
   ```

   - npm needs some minutes after a publish. Until then the first two commands answer `404 Not Found`. The workflow waits up to 10 minutes for the same reason.
   - The first two commands print the version. `dist-tags` shows `latest: '0.2.0'`.
   - The last command prints one line that ends with `refs/tags/v0.2.0`.

   Then try the commands: `npx create-toraline-monorepo --version` prints the version, and `npx create-toraline-monorepo my-test --yes` in an empty folder creates a monorepo.

7. **Tell the repositories that use the boilerplate.** The list is [repositories.md](repositories.md). In each of them a person or an agent runs `npx update-toraline-monorepo`.

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

The rules of npm for removing a version (`npm unpublish`): https://docs.npmjs.com/policies/unpublish. Use it only for a version that has a secret inside.

## What the workflow does not do

- It does not run the whole `make check` of the repository, only the checks of `cli/`. The pull request of step 4 ran the whole check.
- It does not create a "Release" on the GitHub page, only the git tag.
- It adds no provenance (the signed note of npm that says which workflow built a package). npm gives provenance only to a package that is built from a public repository, and this repository is private today.

## Status

- **Done:** the workflow file, the checks of the packed files, this document. The YAML of the workflow was parsed, and its steps were read one by one.
- **Not done:** the workflow was never run: it runs only on GitHub, from the branch `main`. No package is on npm. No tag `v0.1.0` exists. The two packages have no license.
- **What you must do:** the one-time setup, then steps 5 and 6 for the first release `0.1.0`. Decide whether the packages get a license.

// Checks of the scripts in boilerplate/public/: the public copy of the
// repository, the text of a release, and the push of a release to the public
// repository. Each test builds small git repositories in a temporary folder
// and runs the real scripts there. No test uses the network. Every name and
// every token in this file is invented.
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, readlinkSync, symlinkSync } from "node:fs";
import { dirname, join } from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

import {
  BOILERPLATE_ROOT,
  commitAll,
  filesUnder,
  git,
  newRepository,
  PUBLIC_COPY_SCRIPT,
  templateRepositoryOfThisCheckout,
  temporaryFolder,
  writeFiles,
} from "./testing";

const PUSH_SCRIPT = "boilerplate/public/push-release.sh";
const TEXT_SCRIPT = "boilerplate/public/release-text.mjs";
const PRIVATE_LIST = "boilerplate/public/private-files.txt";

// Built from two parts, so that this file itself holds no text with the form of a token.
const inventedToken = `ghp_${"a1B2".repeat(6)}`;

function realFile(relativePath: string): string {
  return readFileSync(join(BOILERPLATE_ROOT, relativePath), "utf8");
}

const UPDATES_OF_RELEASE = {
  version: "0.2.0",
  date: "2026-12-01",
  coreVersion: "0.1.9",
  updates: [
    { id: "0.2.0-core", title: "A new writing rule", kind: "core-files", appliedBy: "program", files: ["agent/rules/"], whatToDo: "Copy the files." },
    { id: "0.2.0-login", title: "A safer login | with a bar", kind: "security", appliedBy: "agent", files: [], whatToDo: "Read the plan." },
  ],
};

/** A small development repository: the real scripts, a private file, a file that only the public repository has. */
function developmentRepository(extraFiles: Record<string, string> = {}): string {
  const repository = newRepository("development");
  writeFiles(repository, {
    "scripts/check-secrets.sh": realFile("scripts/check-secrets.sh"),
    [PUBLIC_COPY_SCRIPT]: realFile(PUBLIC_COPY_SCRIPT),
    [PUSH_SCRIPT]: realFile(PUSH_SCRIPT),
    [TEXT_SCRIPT]: realFile(TEXT_SCRIPT),
    [PRIVATE_LIST]: "# A comment line\n\n.github/workflows/release.yml\n  private-notes  \nnot-there.txt\n",
    "boilerplate/public/overlay/.github/workflows/publish.yml": "name: Publish\n",
    "boilerplate/public/overlay/README.md": "The public text.\n",
    "boilerplate/VERSION": "0.2.0\n",
    "boilerplate/updates/0.2.0.json": `${JSON.stringify(UPDATES_OF_RELEASE, null, 2)}\n`,
    ".github/workflows/release.yml": "name: Release\n",
    ".github/workflows/check.yml": "name: Check\n",
    "private-notes/plan.md": "A plan that stays private.\n",
    "README.md": "The development text.\n",
    "docs/guide.md": "A guide.\n",
    ...extraFiles,
  });
  mkdirSync(join(repository, ".claude"), { recursive: true });
  symlinkSync("../docs", join(repository, ".claude", "guides"));
  chmodSync(join(repository, PUBLIC_COPY_SCRIPT), 0o755);
  commitAll(repository, "first");
  return repository;
}

interface ScriptResult {
  exitCode: number | null;
  output: string;
  errorOutput: string;
}

function runIn(
  workingDirectory: string,
  program: string,
  programArguments: string[],
  environment: Record<string, string> = {},
): ScriptResult {
  const result = spawnSync(program, programArguments, {
    cwd: workingDirectory,
    encoding: "utf8",
    env: { ...process.env, PRIVATE_NAMES_FILE: join(workingDirectory, "..", "no-names.txt"), ...environment },
  });
  return { exitCode: result.status, output: result.stdout, errorOutput: result.stderr };
}

function makeCopy(repository: string, output: string, environment: Record<string, string> = {}): ScriptResult {
  return runIn(repository, "bash", [PUBLIC_COPY_SCRIPT, output], environment);
}

/** Every file and every link under a folder, as sorted paths from that folder. A link is not followed. Skips .git. */
function pathsUnder(rootDirectory: string, folder = ""): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(join(rootDirectory, folder))) {
    const relativePath = folder === "" ? entry : `${folder}/${entry}`;
    if (entry === ".git") {
      continue;
    }
    if (lstatSync(join(rootDirectory, relativePath)).isDirectory()) {
      found.push(...pathsUnder(rootDirectory, relativePath));
    } else {
      found.push(relativePath);
    }
  }
  return found.sort();
}

/** The path and the content of every file of a folder, a link as the path it points to. */
function contentOf(folder: string): Record<string, string> {
  return Object.fromEntries(
    pathsUnder(folder).map((file) => {
      const fullPath = join(folder, file);
      return [file, lstatSync(fullPath).isSymbolicLink() ? `link to ${readlinkSync(fullPath)}` : readFileSync(fullPath, "utf8")];
    }),
  );
}

describe("boilerplate/public/make-public-copy.sh", () => {
  it("writes the tracked files of the commit, without the private ones, with the files of the overlay", () => {
    const repository = developmentRepository();
    // Not in the commit: a new file, and a change of a tracked file.
    writeFiles(repository, { "not-committed.md": "new\n", "docs/guide.md": "A changed guide.\n" });
    const output = join(temporaryFolder("output"), "copy");

    const result = makeCopy(repository, output);

    expect(result.errorOutput).toBe("");
    expect(result.exitCode).toBe(0);
    expect(existsSync(join(output, ".github/workflows/release.yml"))).toBe(false);
    expect(existsSync(join(output, "private-notes"))).toBe(false);
    expect(existsSync(join(output, "not-committed.md"))).toBe(false);
    expect(existsSync(join(output, ".git"))).toBe(false);
    expect(readFileSync(join(output, "docs/guide.md"), "utf8")).toBe("A guide.\n");
    expect(readFileSync(join(output, ".github/workflows/check.yml"), "utf8")).toBe("name: Check\n");
    // The overlay adds a file and replaces a file.
    expect(readFileSync(join(output, ".github/workflows/publish.yml"), "utf8")).toBe("name: Publish\n");
    expect(readFileSync(join(output, "README.md"), "utf8")).toBe("The public text.\n");
    // A link stays a link, and a script stays a program.
    expect(readlinkSync(join(output, ".claude/guides"))).toBe("../docs");
    expect(lstatSync(join(output, PUBLIC_COPY_SCRIPT)).mode & 0o100).toBe(0o100);
    expect(result.output).toContain("Left out: .github/workflows/release.yml\n");
    expect(result.output).toContain("Left out: private-notes\n");
    expect(result.output).toContain("Left out: not-there.txt (it is not in this copy)\n");
    expect(result.output).toContain("NOT checked: private names");
  });

  it("gives the same files for the same commit, and the files of an older commit when asked", () => {
    const repository = developmentRepository();
    const firstCommit = git(repository, "rev-parse", "HEAD").trim();
    const outputs = temporaryFolder("output");
    makeCopy(repository, join(outputs, "first"));
    writeFiles(repository, { "docs/guide.md": "A second guide.\n" });
    commitAll(repository, "second");

    const again = runIn(repository, "bash", [PUBLIC_COPY_SCRIPT, join(outputs, "again"), firstCommit]);
    const newer = makeCopy(repository, join(outputs, "newer"));

    expect(again.exitCode).toBe(0);
    expect(contentOf(join(outputs, "again"))).toEqual(contentOf(join(outputs, "first")));
    expect(newer.exitCode).toBe(0);
    expect(readFileSync(join(outputs, "newer", "docs/guide.md"), "utf8")).toBe("A second guide.\n");
  });

  it("refuses a copy that holds a private name, and does not print the name", () => {
    const repository = developmentRepository({ "docs/history.md": "The model is `Invented-Private-Shop`.\n" });
    const namesFile = join(temporaryFolder("names"), "private-names.txt");
    writeFiles(dirname(namesFile), { "private-names.txt": "# The names\ninvented-private-shop\n" });

    const result = makeCopy(repository, join(temporaryFolder("output"), "copy"), { PRIVATE_NAMES_FILE: namesFile });

    expect(result.exitCode).toBe(1);
    expect(result.errorOutput).toContain("Refused: docs/history.md adds a private name");
    expect(result.errorOutput).toContain("must NOT be published");
    expect(`${result.output}${result.errorOutput}`.toLowerCase()).not.toContain("invented-private-shop");
  });

  it("accepts a private name in a file that is left out", () => {
    const repository = developmentRepository({ "private-notes/customers.md": "Invented-Private-Shop\n" });
    const namesFile = join(temporaryFolder("names"), "private-names.txt");
    writeFiles(dirname(namesFile), { "private-names.txt": "invented-private-shop\n" });

    const result = makeCopy(repository, join(temporaryFolder("output"), "copy"), { PRIVATE_NAMES_FILE: namesFile });

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("Checking the copy for secrets and for the private names");
  });

  it("refuses a copy that holds something with the form of a token", () => {
    const repository = developmentRepository({ "docs/setup.md": `Use the token ${inventedToken}.\n` });

    const result = makeCopy(repository, join(temporaryFolder("output"), "copy"));

    expect(result.exitCode).toBe(1);
    expect(result.errorOutput).toContain("Refused: docs/setup.md adds something that looks like a secret.");
    expect(result.errorOutput).toContain("must NOT be published");
  });

  it("refuses a folder that is not empty, a folder inside the repository, and a commit that does not exist", () => {
    const repository = developmentRepository();
    const inUse = temporaryFolder("in-use");
    writeFiles(inUse, { "keep.txt": "keep\n" });

    const notEmpty = makeCopy(repository, inUse);
    const inside = makeCopy(repository, join(repository, "copy"));
    const noCommit = runIn(repository, "bash", [PUBLIC_COPY_SCRIPT, join(temporaryFolder("output"), "copy"), "no-such-branch"]);

    expect(notEmpty.exitCode).toBe(1);
    expect(notEmpty.errorOutput).toContain("is not empty. Nothing was changed.");
    expect(filesUnder(inUse)).toEqual(["keep.txt"]);
    expect(inside.exitCode).toBe(1);
    expect(inside.errorOutput).toContain("must be outside the repository");
    expect(existsSync(join(repository, "copy"))).toBe(false);
    expect(noCommit.exitCode).toBe(1);
    expect(noCommit.errorOutput).toContain('"no-such-branch" is not a commit, a tag or a branch');
  });

  it("refuses a private path that points outside the repository", () => {
    const repository = developmentRepository({ [PRIVATE_LIST]: "../outside.txt\n" });

    const result = makeCopy(repository, join(temporaryFolder("output"), "copy"));

    expect(result.exitCode).toBe(1);
    expect(result.errorOutput).toContain('the path "../outside.txt" is not a path inside the repository');
  });
});

describe("the public copy of this checkout", () => {
  let publicCopy: string;

  beforeAll(() => {
    publicCopy = templateRepositoryOfThisCheckout();
  });

  it("has the workflows of the public repository, and not the workflow that starts a release", () => {
    expect(existsSync(join(publicCopy, ".github/workflows/release.yml"))).toBe(false);
    expect(pathsUnder(join(publicCopy, ".github/workflows"))).toEqual(["check.yml", "publish.yml"]);
    expect(existsSync(join(publicCopy, "local-docs"))).toBe(false);
  });

  it("has the check of this repository, which also runs on a push to main", () => {
    const withoutPushTrigger = (text: string) =>
      text.replace("  push:\n    branches: [main]\n", "").replace(" and on every push to main.", ".");
    const publicCheck = readFileSync(join(publicCopy, ".github/workflows/check.yml"), "utf8");

    expect(publicCheck).toContain("on:\n  pull_request:\n    branches: [main]\n  push:\n    branches: [main]\n");
    expect(withoutPushTrigger(publicCheck)).toBe(withoutPushTrigger(realFile(".github/workflows/check.yml")));
  });

  it("links only to files that it holds", () => {
    const broken: string[] = [];
    const markdownFiles = filesUnder(publicCopy).filter(
      (file) => file.endsWith(".md") && !file.startsWith("boilerplate/without-sample/") && !file.startsWith("boilerplate/new-project/") && file !== "agent/templates/AGENTS.md",
    );
    for (const file of markdownFiles) {
      for (const match of readFileSync(join(publicCopy, file), "utf8").matchAll(/\]\(([^)#\s]+)(#[^)]*)?\)/g)) {
        const target = match[1] ?? "";
        if (!/^[a-z]+:/.test(target) && !existsSync(join(publicCopy, dirname(file), target))) {
          broken.push(`${file} links to ${target}`);
        }
      }
    }

    expect(markdownFiles.length).toBeGreaterThan(50);
    expect(broken).toEqual([]);
  });

  it("does not change when the rules are applied a second time", () => {
    const before = git(publicCopy, "status", "--porcelain");

    const result = runIn(publicCopy, "bash", [PUBLIC_COPY_SCRIPT, "--apply-rules", publicCopy]);

    expect(result.exitCode).toBe(0);
    expect(git(publicCopy, "status", "--porcelain")).toBe(before);
  });
});

describe("boilerplate/public/release-text.mjs", () => {
  it("prints the message of the release commit: the tag, then the title and the kind of each update", () => {
    const repository = developmentRepository();

    const result = runIn(repository, "node", [TEXT_SCRIPT, "0.2.0", "commit"]);

    expect(result.exitCode).toBe(0);
    expect(result.output).toBe(
      "release: v0.2.0\n\nThe updates of this release:\n- A new writing rule (Core files)\n- A safer login \\| with a bar (Security)\n",
    );
  });

  it("prints the body of the release pull request, with one row per update", () => {
    const repository = developmentRepository();

    const result = runIn(repository, "node", [TEXT_SCRIPT, "0.2.0", "pull-request"]);

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("Release `0.2.0` of the boilerplate.");
    expect(result.output).toContain("| A new writing rule | Core files | the command `update-toraline-monorepo` |");
    expect(result.output).toContain("| A safer login \\| with a bar | Security | an agent or a person, from the plan file |");
    expect(result.output).toContain("creates the tag `v0.2.0`");
    expect(result.output).toContain("`create-toraline-monorepo@0.2.0` and `update-toraline-monorepo@0.2.0`");
  });

  it("stops when the release has no updates file", () => {
    const repository = developmentRepository();

    const result = runIn(repository, "node", [TEXT_SCRIPT, "0.3.0", "commit"]);

    expect(result.exitCode).toBe(1);
    expect(result.errorOutput).toContain("0.3.0.json does not exist or is not valid JSON");
  });
});

/** A folder with a program "gh" that writes each call into a file and answers what the test says. */
function fakeGitHubCommand(openPullRequest: string): { folder: string; calls: () => string } {
  const folder = temporaryFolder("fake-gh");
  writeFiles(folder, {
    gh: [
      "#!/usr/bin/env bash",
      `printf '%s\\n' "$*" >> "${folder}/calls.txt"`,
      `if [ "$1 $2" = "pr list" ]; then printf '%s' "${openPullRequest}"; fi`,
      'if [ "$1 $2" = "pr create" ]; then echo "https://github.com/sample-owner/sample-public/pull/1"; fi',
      "",
    ].join("\n"),
    "calls.txt": "",
  });
  chmodSync(join(folder, "gh"), 0o755);
  return { folder, calls: () => readFileSync(join(folder, "calls.txt"), "utf8") };
}

describe("boilerplate/public/push-release.sh", () => {
  /** A public repository with one release, as a folder that git can clone and push to. */
  function publicRepository(): string {
    const work = newRepository("public-work");
    writeFiles(work, { "boilerplate/VERSION": "0.1.0\n", "README.md": "The first release.\n", "old-file.md": "A file that the next release removes.\n" });
    commitAll(work, "release: v0.1.0", "0.1.0");
    const bare = join(temporaryFolder("public"), "public.git");
    git(work, "clone", "--quiet", "--bare", work, bare);
    return bare;
  }

  interface Release {
    development: string;
    copy: string;
    publicAddress: string;
  }

  function preparedRelease(): Release {
    const development = developmentRepository();
    const copy = join(temporaryFolder("output"), "copy");
    expect(makeCopy(development, copy).exitCode).toBe(0);
    return { development, copy, publicAddress: publicRepository() };
  }

  function pushRelease(release: Release, version: string, environment: Record<string, string> = {}): ScriptResult {
    return runIn(release.development, "bash", [PUSH_SCRIPT, version, release.copy], {
      PUBLIC_REPOSITORY: "sample-owner/sample-public",
      PUBLIC_REPOSITORY_URL: release.publicAddress,
      ...environment,
    });
  }

  it("pushes one commit with exactly the files of the copy, on release/v<version>, with main as its parent, and no tag", () => {
    const release = preparedRelease();

    const developmentCommit = git(release.development, "rev-parse", "HEAD").trim();

    const result = pushRelease(release, "0.2.0", { SKIP_PULL_REQUEST: "1", SOURCE_COMMIT: developmentCommit });

    expect(result.errorOutput).toBe("");
    expect(result.exitCode).toBe(0);
    const branch = "release/v0.2.0";
    expect(git(release.publicAddress, "rev-parse", `${branch}^`).trim()).toBe(git(release.publicAddress, "rev-parse", "main").trim());
    expect(git(release.publicAddress, "log", "-1", "--format=%an <%ae>%n%cn <%ce>%n%B", branch)).toBe(
      "github-actions[bot] <41898282+github-actions[bot]@users.noreply.github.com>\n" +
        "github-actions[bot] <41898282+github-actions[bot]@users.noreply.github.com>\n" +
        "release: v0.2.0\n\nThe updates of this release:\n- A new writing rule (Core files)\n- A safer login \\| with a bar (Security)\n\n" +
        `Development commit: ${developmentCommit}\n\n`,
    );
    const committedFiles = git(release.publicAddress, "ls-tree", "-r", "--name-only", branch).trim().split("\n").sort();
    expect(committedFiles).toEqual(pathsUnder(release.copy));
    expect(committedFiles).not.toContain("old-file.md");
    expect(git(release.publicAddress, "show", `${branch}:README.md`)).toBe("The public text.\n");
    expect(git(release.publicAddress, "ls-tree", branch, ".claude/guides")).toMatch(/^120000 /);
    // No tag, and main did not move.
    expect(git(release.publicAddress, "tag", "--list").trim()).toBe("v0.1.0");
    expect(git(release.publicAddress, "log", "-1", "--format=%s", "main").trim()).toBe("release: v0.1.0");
    expect(result.output).toContain("The last released version in the public repository: 0.1.0. This release: 0.2.0.");
    expect(result.output).toContain("SKIP_PULL_REQUEST=1: no pull request was opened.");
  });

  it("opens the pull request to main with the title and the body of the release", () => {
    const release = preparedRelease();
    const gitHub = fakeGitHubCommand("");

    const result = pushRelease(release, "0.2.0", { PATH: `${gitHub.folder}:${process.env.PATH ?? ""}` });

    expect(result.exitCode).toBe(0);
    expect(gitHub.calls()).toContain("pr list --repo sample-owner/sample-public --head release/v0.2.0 --base main --state open");
    expect(gitHub.calls()).toMatch(
      /pr create --repo sample-owner\/sample-public --base main --head release\/v0\.2\.0 --title Release v0\.2\.0 --body-file \S+\n/,
    );
    expect(result.output).toContain("https://github.com/sample-owner/sample-public/pull/1");
  });

  it("a second run keeps the branch and the pull request that exist", () => {
    const release = preparedRelease();
    const gitHub = fakeGitHubCommand("https://github.com/sample-owner/sample-public/pull/1");
    pushRelease(release, "0.2.0", { SKIP_PULL_REQUEST: "1" });
    const firstCommit = git(release.publicAddress, "rev-parse", "release/v0.2.0").trim();

    const result = pushRelease(release, "0.2.0", { PATH: `${gitHub.folder}:${process.env.PATH ?? ""}` });

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("The branch release/v0.2.0 already exists in the public repository with the same files. Kept.");
    expect(result.output).toContain("The pull request is already open: https://github.com/sample-owner/sample-public/pull/1");
    expect(git(release.publicAddress, "rev-parse", "release/v0.2.0").trim()).toBe(firstCommit);
    expect(gitHub.calls()).not.toContain("pr create");
  });

  it("stops when the branch exists with other files, and changes nothing", () => {
    const release = preparedRelease();
    pushRelease(release, "0.2.0", { SKIP_PULL_REQUEST: "1" });
    const firstCommit = git(release.publicAddress, "rev-parse", "release/v0.2.0").trim();
    writeFiles(release.copy, { "docs/guide.md": "Another guide.\n" });

    const result = pushRelease(release, "0.2.0", { SKIP_PULL_REQUEST: "1" });

    expect(result.exitCode).toBe(1);
    expect(result.errorOutput).toContain("The branch release/v0.2.0 already exists in the public repository with other files");
    expect(git(release.publicAddress, "rev-parse", "release/v0.2.0").trim()).toBe(firstCommit);
  });

  it("stops when the version is not higher than the last release of the public repository", () => {
    const release = preparedRelease();
    writeFiles(release.copy, { "boilerplate/VERSION": "0.1.0\n", "boilerplate/updates/0.1.0.json": "{}\n" });

    const result = pushRelease(release, "0.1.0", { SKIP_PULL_REQUEST: "1" });

    expect(result.exitCode).toBe(1);
    expect(result.errorOutput).toContain("The public repository already has the release 0.1.0. Version 0.1.0 is not higher.");
    expect(git(release.publicAddress, "branch", "--list").trim()).toBe("* main");
  });

  it("stops when the version is not the version of the copy", () => {
    const release = preparedRelease();

    const result = pushRelease(release, "0.3.0", { SKIP_PULL_REQUEST: "1" });

    expect(result.exitCode).toBe(1);
    expect(result.errorOutput).toContain('You asked for version 0.3.0, and boilerplate/VERSION of the copy says "0.2.0".');
  });

  it("stops when the public repository is empty", () => {
    const release = preparedRelease();
    const empty = join(temporaryFolder("public"), "empty.git");
    git(release.development, "init", "--quiet", "--bare", "--initial-branch", "main", empty);

    const result = pushRelease({ ...release, publicAddress: empty }, "0.2.0", { SKIP_PULL_REQUEST: "1" });

    expect(result.exitCode).toBe(1);
    expect(result.errorOutput).toContain("The public repository has no branch main.");
  });
});

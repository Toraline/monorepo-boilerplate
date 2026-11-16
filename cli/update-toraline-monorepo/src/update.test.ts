import { chmodSync, existsSync, readFileSync, realpathSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import type { Asker } from "../../shared/src/prompt";
import { readRecord, RECORD_FILE_NAME } from "../../shared/src/record";
import { commitAll, git, newRepository, temporaryFolder, writeFiles } from "../../shared/src/testing";
import { main } from "./main";
import { PLAN_FILE } from "./options";
import { REFERENCE_PREFIX } from "./releases";

const AGENTS_FILE = (mainCheckout: string) =>
  [
    "# sample-shop: instructions for agents",
    "",
    "| Key | Value | Meaning |",
    "|---|---|---|",
    "| `base_branch` | `main` | Branch that pull requests target |",
    `| \`main_checkout\` | \`${mainCheckout}\` | May git change the main checkout |`,
    "",
  ].join("\n");

const PACKAGE_FILE = (nextVersion: string) =>
  `${JSON.stringify({ name: "web", dependencies: { next: nextVersion, react: "19.2.4" } }, null, 2)}\n`;

/** The files that the fake boilerplate and a monorepo created from it share, at version 0.1.0. */
const FILES_OF_FIRST_RELEASE = {
  ".gitignore": "local-docs/\n",
  "AGENTS.md": AGENTS_FILE("open"),
  "agent/CORE_VERSION": "0.1.0\n",
  "agent/rules/writing.md": "Rule 1: answer first.\n",
  "agent/rules/old-rule.md": "A rule that the next release deletes.\n",
  "scripts/tool.sh": "#!/usr/bin/env bash\necho one\n",
  "apps/web/package.json": PACKAGE_FILE("16.4.3"),
  "apps/api/requirements.txt": "Django==5.2.1\npsycopg==3.2.9\n",
};

const FIRST_UPDATES = {
  version: "0.1.0",
  date: "2026-11-15",
  coreVersion: "0.1.0",
  updates: [
    {
      id: "0.1.0-first-release",
      title: "The first release",
      kind: "new-feature",
      appliedBy: "agent",
      files: [],
      whatToDo: "Nothing.",
    },
  ],
};

const SECOND_UPDATES = {
  version: "0.2.0",
  date: "2026-12-01",
  coreVersion: "0.2.0",
  updates: [
    {
      id: "0.2.0-core",
      title: "The core 0.2.0: a new writing rule",
      kind: "core-files",
      appliedBy: "program",
      files: ["agent/rules/", "agent/CORE_VERSION", "scripts/tool.sh"],
      whatToDo: "Copy the files from the boilerplate.",
    },
    {
      id: "0.2.0-next",
      title: "Next.js 16.4.6 and Django 5.2.8, which close a security hole",
      kind: "security",
      appliedBy: "program",
      files: ["apps/web/package.json", "apps/api/requirements.txt"],
      whatToDo: "Write the versions into the files and install.",
      dependencies: [
        { file: "apps/web/package.json", name: "next", from: "16.4.3", to: "16.4.6" },
        { file: "apps/api/requirements.txt", name: "Django", from: "5.2.1", to: "5.2.8" },
      ],
    },
    {
      id: "0.2.0-theme",
      title: "A new color token for warnings",
      kind: "manual-change",
      appliedBy: "agent",
      files: ["packages/ui/src/theme/theme-config.ts"],
      whatToDo: "Add the token bg-warning to both themes of your project.",
    },
  ],
};

/** A fake boilerplate in a local git repository: release 0.1.0, and release 0.2.0 when asked. */
function boilerplateWith(secondRelease: boolean): string {
  const source = newRepository("boilerplate");
  writeFiles(source, {
    ...FILES_OF_FIRST_RELEASE,
    "boilerplate/VERSION": "0.1.0\n",
    "boilerplate/updates/0.1.0.json": JSON.stringify(FIRST_UPDATES),
  });
  chmodSync(join(source, "scripts/tool.sh"), 0o755);
  commitAll(source, "release 0.1.0", "0.1.0");
  if (secondRelease) {
    writeFiles(source, {
      "boilerplate/VERSION": "0.2.0\n",
      "boilerplate/updates/0.2.0.json": JSON.stringify(SECOND_UPDATES),
      "agent/CORE_VERSION": "0.2.0\n",
      "agent/rules/writing.md": "Rule 1: answer first.\nRule 2: be specific.\n",
      "agent/rules/new-rule.md": "A rule that is new.\n",
      "scripts/tool.sh": "#!/usr/bin/env bash\necho two\n",
      "apps/web/package.json": PACKAGE_FILE("16.4.6"),
      "apps/api/requirements.txt": "Django==5.2.8\npsycopg==3.2.9\n",
    });
    chmodSync(join(source, "scripts/tool.sh"), 0o755);
    rmSync(join(source, "agent/rules/old-rule.md"));
    commitAll(source, "release 0.2.0", "0.2.0");
  }
  return source;
}

/** A monorepo that was created from release 0.1.0 of the fake boilerplate. */
function monorepoFromFirstRelease(changes: Record<string, string> = {}): string {
  const monorepo = newRepository("monorepo");
  writeFiles(monorepo, {
    ...FILES_OF_FIRST_RELEASE,
    [RECORD_FILE_NAME]: JSON.stringify({
      boilerplate: "Toraline/monorepo-boilerplate",
      createdFromVersion: "0.1.0",
      createdOn: "2026-11-15",
      appliedUpdates: ["0.1.0-first-release"],
    }),
    ...changes,
  });
  chmodSync(join(monorepo, "scripts/tool.sh"), 0o755);
  commitAll(monorepo, "chore: start from the boilerplate 0.1.0");
  return monorepo;
}

function neverAsk(): Asker {
  throw new Error("The command asked a question, and the test expected none.");
}

async function runCommand(
  directory: string,
  commandArguments: string[],
  createAsker: () => Asker = neverAsk,
): Promise<{ exitCode: number; output: string }> {
  const lines: string[] = [];
  const exitCode = await main(commandArguments, "0.1.0", directory, createAsker, (line) => lines.push(line));
  return { exitCode, output: lines.join("\n") };
}

function textOf(directory: string, relativePath: string): string {
  return readFileSync(join(directory, relativePath), "utf8");
}

function subjectsOf(directory: string, branch: string): string[] {
  return git(directory, "log", "--format=%s", branch).trim().split("\n");
}

describe("update-toraline-monorepo: nothing to do", () => {
  it("says that the folder has no record file, and how to add one to an older repository", async () => {
    const folder = newRepository("no-record");
    writeFiles(folder, { "README.md": "x" });
    commitAll(folder, "first");

    const { exitCode, output } = await runCommand(folder, ["--check", "--source", boilerplateWith(true)]);

    expect(exitCode).toBe(1);
    expect(output).toContain(`has no record file (${RECORD_FILE_NAME})`);
    expect(output).toContain("--init-record <version>");
  });

  it("says that a folder outside git is not a repository", async () => {
    const { exitCode, output } = await runCommand(temporaryFolder("no-git"), ["--check"]);

    expect(exitCode).toBe(1);
    expect(output).toContain("is not inside a git repository");
  });

  it("says that no update exists when the boilerplate has no newer release, with exit code 0", async () => {
    const monorepo = monorepoFromFirstRelease();

    const { exitCode, output } = await runCommand(monorepo, ["--check", "--source", boilerplateWith(false)]);

    expect(exitCode).toBe(0);
    expect(output).toContain("The boilerplate has no release newer than 0.1.0. Nothing to update.");
  });

  it("says that no update exists when the monorepo has every update of the newer release", async () => {
    const monorepo = monorepoFromFirstRelease({
      [RECORD_FILE_NAME]: JSON.stringify({
        createdFromVersion: "0.1.0",
        appliedUpdates: ["0.1.0-first-release", "0.2.0-core", "0.2.0-next", "0.2.0-theme"],
      }),
    });

    const { exitCode, output } = await runCommand(monorepo, ["--yes", "--source", boilerplateWith(true)]);

    expect(exitCode).toBe(0);
    expect(output).toContain("has every update of the newer releases (0.2.0)");
    expect(git(monorepo, "branch", "--show-current").trim()).toBe("main");
  });
});

describe("update-toraline-monorepo --check", () => {
  it("lists the updates by kind, changes nothing, and exits with 2", async () => {
    const monorepo = monorepoFromFirstRelease();
    const commitBefore = git(monorepo, "rev-parse", "HEAD");

    const { exitCode, output } = await runCommand(monorepo, ["--check", "--source", boilerplateWith(true)]);

    expect(exitCode).toBe(2);
    expect(output).toContain("1 newer release (0.2.0) with 3 updates");
    const coreAt = output.indexOf("Core files");
    const securityAt = output.indexOf("Security:");
    const manualAt = output.indexOf("Manual changes:");
    expect(coreAt).toBeGreaterThan(-1);
    expect(securityAt).toBeGreaterThan(coreAt);
    expect(manualAt).toBeGreaterThan(securityAt);
    expect(output).toContain("  - 0.2.0-core: The core 0.2.0: a new writing rule (release 0.2.0; the command applies it)");
    expect(output).toContain("  - 0.2.0-theme: A new color token for warnings (release 0.2.0; it goes into the plan for an agent)");
    expect(output).not.toContain("0.1.0-first-release");

    expect(git(monorepo, "rev-parse", "HEAD")).toBe(commitBefore);
    expect(git(monorepo, "status", "--porcelain")).toBe("");
    expect(git(monorepo, "branch", "--format=%(refname:short)").trim()).toBe("main");
    expect(git(monorepo, "for-each-ref", REFERENCE_PREFIX)).toBe("");
    expect(existsSync(join(monorepo, PLAN_FILE))).toBe(false);
  });

  it("works with uncommitted changes, because it changes nothing", async () => {
    const monorepo = monorepoFromFirstRelease();
    writeFiles(monorepo, { "notes.txt": "not committed" });

    expect((await runCommand(monorepo, ["--check", "--source", boilerplateWith(true)])).exitCode).toBe(2);
  });
});

describe("update-toraline-monorepo: applying", () => {
  it("applies the updates that a program can apply, one commit each, on a new branch, and writes the plan", async () => {
    const monorepo = monorepoFromFirstRelease();
    const mainBefore = git(monorepo, "rev-parse", "main");

    const { exitCode, output } = await runCommand(monorepo, [
      "--all", "--skip-install", "--source", boilerplateWith(true),
    ]);

    expect(exitCode).toBe(0);
    // A new branch; the base branch did not move.
    expect(git(monorepo, "branch", "--show-current").trim()).toBe("boilerplate-update-0.2.0");
    expect(git(monorepo, "rev-parse", "main")).toBe(mainBefore);
    // One commit per applied update, oldest last.
    expect(subjectsOf(monorepo, "boilerplate-update-0.2.0")).toEqual([
      "chore(boilerplate): Next.js 16.4.6 and Django 5.2.8, which close a security hole (update 0.2.0-next)",
      "chore(boilerplate): The core 0.2.0: a new writing rule (update 0.2.0-core)",
      "chore: start from the boilerplate 0.1.0",
    ]);
    expect(git(monorepo, "show", "--format=", "--name-only", "HEAD~1").trim().split("\n").sort()).toEqual([
      RECORD_FILE_NAME,
      "agent/CORE_VERSION",
      "agent/rules/new-rule.md",
      "agent/rules/old-rule.md",
      "agent/rules/writing.md",
      "scripts/tool.sh",
    ]);
    // The core files: changed, added, deleted, and still executable.
    expect(textOf(monorepo, "agent/rules/writing.md")).toBe("Rule 1: answer first.\nRule 2: be specific.\n");
    expect(textOf(monorepo, "agent/rules/new-rule.md")).toBe("A rule that is new.\n");
    expect(existsSync(join(monorepo, "agent/rules/old-rule.md"))).toBe(false);
    expect(textOf(monorepo, "agent/CORE_VERSION")).toBe("0.2.0\n");
    expect(textOf(monorepo, "scripts/tool.sh")).toContain("echo two");
    expect(statSync(join(monorepo, "scripts/tool.sh")).mode & 0o111).not.toBe(0);
    // The exact dependency versions; the other lines of the files are the same.
    expect(textOf(monorepo, "apps/web/package.json")).toBe(PACKAGE_FILE("16.4.6"));
    expect(textOf(monorepo, "apps/api/requirements.txt")).toBe("Django==5.2.8\npsycopg==3.2.9\n");

    // The record file has the applied updates only.
    expect(readRecord(monorepo)?.appliedUpdates).toEqual(["0.1.0-first-release", "0.2.0-core", "0.2.0-next"]);

    // The plan file has the update that is left, and is not committed.
    const plan = textOf(monorepo, PLAN_FILE);
    expect(plan).toContain("### 0.2.0-theme: A new color token for warnings");
    expect(plan).toContain("- Status: open");
    expect(plan).toContain("- What to do: Add the token bg-warning to both themes of your project.");
    expect(plan).toContain("  - `packages/ui/src/theme/theme-config.ts`");
    expect(plan).toContain("- `0.2.0-core`: The core 0.2.0: a new writing rule (commit ");
    expect(plan).not.toContain("### 0.2.0-core");
    expect(git(monorepo, "status", "--porcelain")).toBe("");

    // The releases stay fetched while a plan has open updates, so the agent can read them.
    expect(git(monorepo, "show", `${REFERENCE_PREFIX}/v0.2.0:agent/CORE_VERSION`)).toBe("0.2.0\n");

    expect(output).toContain("Applied and committed: 2 updates. Left for the plan: 1 update.");
    expect(output).toContain("Nothing was pushed. No pull request and no ticket was created.");
    expect(output).toContain("type /update-boilerplate");
  });

  it("keeps a file that the project changed, shows the difference, and leaves that update for the plan", async () => {
    const ownRule = "Rule 1: answer first.\nRule of this project: write in Portuguese.\n";
    const monorepo = monorepoFromFirstRelease({ "agent/rules/writing.md": ownRule });

    const { exitCode, output } = await runCommand(monorepo, [
      "--all", "--skip-install", "--source", boilerplateWith(true),
    ]);

    expect(exitCode).toBe(0);
    // No file of the update was written: not the changed one, and not the others.
    expect(textOf(monorepo, "agent/rules/writing.md")).toBe(ownRule);
    expect(textOf(monorepo, "agent/CORE_VERSION")).toBe("0.1.0\n");
    expect(existsSync(join(monorepo, "agent/rules/new-rule.md"))).toBe(false);
    expect(output).toContain("Not applied: 0.2.0-core. Your project changed 1 of its files. No file was overwritten.");
    expect(output).toContain("The difference between the boilerplate 0.1.0 and your file agent/rules/writing.md:");
    expect(output).toContain("+Rule of this project: write in Portuguese.");

    // The other update was applied; the record has it, and not the one that was kept.
    expect(readRecord(monorepo)?.appliedUpdates).toEqual(["0.1.0-first-release", "0.2.0-next"]);
    expect(subjectsOf(monorepo, "HEAD")).toHaveLength(2);

    const plan = textOf(monorepo, PLAN_FILE);
    expect(plan).toContain("### 0.2.0-core: The core 0.2.0: a new writing rule");
    expect(plan).toContain(
      "- Why it is in the plan: Your project changed these files, so the command did not overwrite them: agent/rules/writing.md.",
    );
    expect(plan).toContain("`git show refs/toraline-boilerplate/v0.2.0:<path>`");
  });

  it("leaves a dependency update for the plan when the project has another version", async () => {
    const monorepo = monorepoFromFirstRelease({ "apps/web/package.json": PACKAGE_FILE("15.9.9") });

    const { output } = await runCommand(monorepo, [
      "--only", "0.2.0-next", "--skip-install", "--source", boilerplateWith(true),
    ]);

    expect(output).toContain("apps/web/package.json has next 15.9.9; the update goes from 16.4.3 to 16.4.6");
    expect(textOf(monorepo, "apps/web/package.json")).toBe(PACKAGE_FILE("15.9.9"));
    expect(textOf(monorepo, "apps/api/requirements.txt")).toBe("Django==5.2.1\npsycopg==3.2.9\n");
    expect(readRecord(monorepo)?.appliedUpdates).toEqual(["0.1.0-first-release"]);
    expect(subjectsOf(monorepo, "HEAD")).toHaveLength(1);
    expect(textOf(monorepo, PLAN_FILE)).toContain("### 0.2.0-next");
  });

  it("takes only the updates of --only", async () => {
    const monorepo = monorepoFromFirstRelease();

    await runCommand(monorepo, ["--only", "0.2.0-core", "--source", boilerplateWith(true)]);

    expect(readRecord(monorepo)?.appliedUpdates).toEqual(["0.1.0-first-release", "0.2.0-core"]);
    expect(textOf(monorepo, "apps/web/package.json")).toBe(PACKAGE_FILE("16.4.3"));
    expect(textOf(monorepo, PLAN_FILE)).toContain("## Left for the agent\n\nNone.");
    // No update is left for an agent, so the fetched releases are removed.
    expect(git(monorepo, "for-each-ref", REFERENCE_PREFIX)).toBe("");
  });

  it("lets the person choose one by one", async () => {
    const monorepo = monorepoFromFirstRelease();
    const answers = ["choose", "no", "yes", "no"];
    const questions: string[] = [];
    const asker: Asker = {
      async ask(question) {
        questions.push(question);
        return answers.shift() ?? "";
      },
      close() {},
    };

    await runCommand(monorepo, ["--skip-install", "--source", boilerplateWith(true)], () => asker);

    expect(questions).toHaveLength(4);
    expect(questions[1]).toContain("Take 0.2.0-core");
    expect(readRecord(monorepo)?.appliedUpdates).toEqual(["0.1.0-first-release", "0.2.0-next"]);
    expect(textOf(monorepo, PLAN_FILE)).not.toContain("0.2.0-theme");
  });

  it("changes nothing when the person chooses none", async () => {
    const monorepo = monorepoFromFirstRelease();

    const { exitCode, output } = await runCommand(monorepo, ["--none", "--source", boilerplateWith(true)]);

    expect(exitCode).toBe(0);
    expect(output).toContain("No update was chosen. Nothing was changed.");
    expect(git(monorepo, "branch", "--show-current").trim()).toBe("main");
    expect(existsSync(join(monorepo, PLAN_FILE))).toBe(false);
  });
});

describe("update-toraline-monorepo: the refusals", () => {
  it("refuses a working tree with changes that are not committed", async () => {
    const monorepo = monorepoFromFirstRelease();
    writeFiles(monorepo, { "agent/CORE_VERSION": "changed and not committed\n" });

    const { exitCode, output } = await runCommand(monorepo, ["--all", "--source", boilerplateWith(true)]);

    expect(exitCode).toBe(1);
    expect(output).toContain("The working tree has 1 change that is not committed");
    expect(output).toContain("What to do: Commit them or put them away");
    expect(git(monorepo, "branch", "--show-current").trim()).toBe("main");
    expect(textOf(monorepo, "agent/CORE_VERSION")).toBe("changed and not committed\n");
  });

  it("refuses --current-branch on the base branch", async () => {
    const monorepo = monorepoFromFirstRelease();

    const { exitCode, output } = await runCommand(monorepo, [
      "--all", "--current-branch", "--source", boilerplateWith(true),
    ]);

    expect(exitCode).toBe(1);
    expect(output).toContain('the branch that is checked out is "main", a base branch');
    expect(subjectsOf(monorepo, "main")).toHaveLength(1);
  });

  it("works on the branch that is checked out with --current-branch, when it is not the base branch", async () => {
    const monorepo = monorepoFromFirstRelease();
    git(monorepo, "switch", "--quiet", "--create", "sample/shp-12-update");

    await runCommand(monorepo, ["--only", "0.2.0-core", "--current-branch", "--source", boilerplateWith(true)]);

    expect(git(monorepo, "branch", "--show-current").trim()).toBe("sample/shp-12-update");
    expect(subjectsOf(monorepo, "sample/shp-12-update")).toHaveLength(2);
    expect(subjectsOf(monorepo, "main")).toHaveLength(1);
  });

  it("refuses a branch name that already exists", async () => {
    const monorepo = monorepoFromFirstRelease();
    git(monorepo, "branch", "boilerplate-update-0.2.0");

    const { exitCode, output } = await runCommand(monorepo, ["--all", "--source", boilerplateWith(true)]);

    expect(exitCode).toBe(1);
    expect(output).toContain('The branch "boilerplate-update-0.2.0" already exists');
  });

  it("refuses an id of --only that is not in the list", async () => {
    const monorepo = monorepoFromFirstRelease();

    const { exitCode, output } = await runCommand(monorepo, [
      "--only", "0.2.0-core,0.9.0-other", "--source", boilerplateWith(true),
    ]);

    expect(exitCode).toBe(1);
    expect(output).toContain("--only names 0.9.0-other");
    expect(git(monorepo, "branch", "--show-current").trim()).toBe("main");
  });

  it.each([
    [["--all", "--none"], "More than one of --all, --none and --only"],
    [["--current-branch", "--branch", "x"], "--current-branch was given together with"],
    [["--init-record", "first"], "is not a version of the boilerplate"],
    [["--unknown-flag"], "Unknown option"],
    [["extra-word"], "Unexpected argument"],
  ])("refuses the flags %j", async (commandArguments, message) => {
    const { exitCode, output } = await runCommand(temporaryFolder("flags"), commandArguments);

    expect(exitCode).toBe(1);
    expect(output).toContain(message);
    expect(output).toContain("What to do: ");
  });
});

describe("update-toraline-monorepo: a protected main checkout", () => {
  it("creates a worktree for the new branch, and leaves the main checkout as it was", async () => {
    const monorepo = monorepoFromFirstRelease({ "AGENTS.md": AGENTS_FILE("protected") });
    const worktree = `${realpathSync(monorepo)}-boilerplate-update-0.2.0`;

    const { exitCode, output } = await runCommand(monorepo, [
      "--only", "0.2.0-next,0.2.0-theme", "--skip-install", "--source", boilerplateWith(true),
    ]);

    expect(exitCode).toBe(0);
    expect(output).toContain(`Created the worktree ${worktree} with the new branch "boilerplate-update-0.2.0".`);
    // The main checkout: same branch, same files, nothing new.
    expect(git(monorepo, "branch", "--show-current").trim()).toBe("main");
    expect(git(monorepo, "status", "--porcelain")).toBe("");
    expect(textOf(monorepo, "apps/web/package.json")).toBe(PACKAGE_FILE("16.4.3"));
    expect(existsSync(join(monorepo, PLAN_FILE))).toBe(false);
    // The worktree: the commit, the record and the plan.
    expect(git(worktree, "branch", "--show-current").trim()).toBe("boilerplate-update-0.2.0");
    expect(textOf(worktree, "apps/web/package.json")).toBe(PACKAGE_FILE("16.4.6"));
    expect(readRecord(worktree)?.appliedUpdates).toEqual(["0.1.0-first-release", "0.2.0-next"]);
    expect(textOf(worktree, PLAN_FILE)).toContain("### 0.2.0-theme");
  });

  it("creates the worktree in the folder of --worktree", async () => {
    const monorepo = monorepoFromFirstRelease();
    const worktree = join(temporaryFolder("worktree"), "update");

    await runCommand(monorepo, [
      "--only", "0.2.0-core", "--worktree", worktree, "--branch", "sample/update", "--source", boilerplateWith(true),
    ]);

    expect(git(worktree, "branch", "--show-current").trim()).toBe("sample/update");
    expect(textOf(worktree, "agent/CORE_VERSION")).toBe("0.2.0\n");
    expect(textOf(monorepo, "agent/CORE_VERSION")).toBe("0.1.0\n");
  });
});

describe("update-toraline-monorepo --init-record", () => {
  it("writes the record file of an older repository, and commits nothing", async () => {
    const folder = newRepository("older");
    writeFiles(folder, FILES_OF_FIRST_RELEASE);
    commitAll(folder, "first");

    const { exitCode, output } = await runCommand(folder, ["--init-record", "0.1.0", "--source", boilerplateWith(true)]);

    expect(exitCode).toBe(0);
    expect(readRecord(folder)).toMatchObject({
      createdFromVersion: "0.1.0",
      appliedUpdates: ["0.1.0-first-release"],
    });
    expect(git(folder, "status", "--porcelain").trim()).toBe(`?? ${RECORD_FILE_NAME}`);
    expect(git(folder, "for-each-ref", REFERENCE_PREFIX)).toBe("");
    expect(output).toContain("Next step: commit");
  });

  it("refuses a version that the boilerplate does not have, and an existing record file", async () => {
    const folder = newRepository("older");
    writeFiles(folder, FILES_OF_FIRST_RELEASE);
    commitAll(folder, "first");
    const source = boilerplateWith(true);

    const unknown = await runCommand(folder, ["--init-record", "0.5.0", "--source", source]);
    expect(unknown.output).toContain("The boilerplate has no release 0.5.0. Its releases: 0.1.0, 0.2.0.");
    expect(existsSync(join(folder, RECORD_FILE_NAME))).toBe(false);

    const existing = await runCommand(monorepoFromFirstRelease(), ["--init-record", "0.1.0", "--source", source]);
    expect(existing.exitCode).toBe(1);
    expect(existing.output).toContain("already exists");
  });
});

describe("update-toraline-monorepo --help and --version", () => {
  it("prints every flag, and says what the command never does", async () => {
    const { exitCode, output } = await runCommand(temporaryFolder("help"), ["--help"]);

    expect(exitCode).toBe(0);
    for (const flag of [
      "--check", "--all", "--none", "--only", "--yes", "--branch", "--current-branch", "--worktree",
      "--skip-install", "--init-record", "--source", "--version", "--help",
    ]) {
      expect(output, flag).toContain(flag);
    }
    expect(output).toContain("never pushes, never opens a pull request and never writes to a ticket tool");
  });

  it("prints the version of the package", async () => {
    expect((await runCommand(temporaryFolder("help"), ["--version"])).output).toBe("0.1.0");
  });
});

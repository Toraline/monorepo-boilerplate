// Checks of the boilerplate itself: its version, its updates files and the two
// packages must agree. A release with a wrong number fails here, in "make check".
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";

import { describe, expect, it } from "vitest";

import { BOILERPLATE_ROOT, git } from "./testing";
import { parseReleaseUpdates, UPDATES_FOLDER, VERSION_FILE } from "./updates";
import { isVersion, sortVersions } from "./versions";

const version = readFileSync(join(BOILERPLATE_ROOT, VERSION_FILE), "utf8").trim();
const releaseVersions = sortVersions(
  readdirSync(join(BOILERPLATE_ROOT, UPDATES_FOLDER)).map((fileName) => fileName.replace(/\.json$/, "")),
);
const releases = releaseVersions.map((releaseVersion) =>
  parseReleaseUpdates(
    readFileSync(join(BOILERPLATE_ROOT, UPDATES_FOLDER, `${releaseVersion}.json`), "utf8"),
    releaseVersion,
  ),
);

describe("the version of the boilerplate", () => {
  it("is three numbers, in boilerplate/VERSION", () => {
    expect(isVersion(version)).toBe(true);
  });

  it("is the version of the newest updates file", () => {
    expect(releaseVersions.at(-1)).toBe(version);
  });

  it("has one valid updates file per release, and no update id twice", () => {
    const updateIds = releases.flatMap((release) => release.updates.map((update) => update.id));

    expect(new Set(updateIds).size).toBe(updateIds.length);
  });

  it("names the core version of agent/CORE_VERSION in the newest updates file", () => {
    const coreVersion = readFileSync(join(BOILERPLATE_ROOT, "agent", "CORE_VERSION"), "utf8").trim();

    expect(releases.at(-1)?.coreVersion).toBe(coreVersion);
  });

  it("is the version of each of the two packages", () => {
    for (const packageName of ["create-toraline-monorepo", "update-toraline-monorepo"]) {
      const packageFile = join(BOILERPLATE_ROOT, "cli", packageName, "package.json");
      // A package that is not built yet has no folder.
      if (existsSync(packageFile)) {
        expect(JSON.parse(readFileSync(packageFile, "utf8")).version, packageName).toBe(version);
      }
    }
  });
});

describe("the workflows of GitHub", () => {
  // The workflows of this repository, and the ones that only the public repository has.
  const workflowFolders = [".github/workflows", "boilerplate/public/overlay/.github/workflows"];
  const workflows = workflowFolders.flatMap((folder) =>
    readdirSync(join(BOILERPLATE_ROOT, folder)).map((name) => ({
      fileName: `${folder}/${name}`,
      text: readFileSync(join(BOILERPLATE_ROOT, folder, name), "utf8"),
    })),
  );

  /** The lines of every "run:" of a workflow: the text that a shell runs. */
  function runLines(text: string): string[] {
    const lines: string[] = [];
    let blockIndentation: number | null = null;
    for (const line of text.split("\n")) {
      const indentation = line.length - line.trimStart().length;
      if (blockIndentation !== null && (line.trim() === "" || indentation > blockIndentation)) {
        lines.push(line);
        continue;
      }
      blockIndentation = null;
      const run = /^(\s*)(?:- )?run:\s*(.*)$/.exec(line);
      if (run === null) {
        continue;
      }
      const startsBlock = /^[|>][+-]?$/.test(run[2] ?? "");
      if (startsBlock) {
        blockIndentation = (run[1] ?? "").length;
      } else {
        lines.push(run[2] ?? "");
      }
    }
    return lines;
  }

  it("name every action by the full id of a commit, with the version in a comment", () => {
    const usesLines = workflows.flatMap((workflow) =>
      workflow.text
        .split("\n")
        .filter((line) => /^\s*(- )?uses:/.test(line))
        .map((line) => `${workflow.fileName}: ${line.trim()}`),
    );

    expect(usesLines.length).toBeGreaterThan(0);
    for (const line of usesLines) {
      expect(line).toMatch(/uses: [\w.-]+\/[\w./-]+@[0-9a-f]{40} # v\d+\.\d+\.\d+$/);
    }
  });

  it("each say what the token of the run may do", () => {
    for (const workflow of workflows) {
      expect(workflow.text, workflow.fileName).toMatch(/^permissions:\n(?: {2}#.*\n)* {2}contents: (read|write)\n/m);
    }
  });

  // A value of GitHub that is written into a shell line is run as shell text. It goes through "env:".
  it("never write a value of GitHub into the text that a shell runs", () => {
    for (const workflow of workflows) {
      const lines = runLines(workflow.text);

      expect(lines.length, workflow.fileName).toBeGreaterThan(0);
      expect(lines.filter((line) => line.includes("${{")), workflow.fileName).toEqual([]);
    }
  });

  it("never run for a pull request with the secrets of the repository (pull_request_target)", () => {
    for (const workflow of workflows) {
      expect(workflow.text, workflow.fileName).not.toMatch(/^\s*pull_request_target\b/m);
    }
  });

  it("give a secret only to a workflow that a pull request cannot start", () => {
    for (const workflow of workflows.filter((candidate) => /\$\{\{\s*secrets\./.test(candidate.text))) {
      expect(workflow.text, workflow.fileName).not.toMatch(/^ {2}pull_request\b/m);
    }
  });
});

describe("the Markdown files of the boilerplate", () => {
  // Some files are copied to another place before they are used. Their links are read from that place:
  // the template of AGENTS.md from the root folder, and a file under boilerplate/without-sample/ or
  // boilerplate/new-project/ from the path of the file that it replaces in a new monorepo.
  function folderOfLinks(file: string): string {
    if (file === "agent/templates/AGENTS.md") {
      return ".";
    }
    return dirname(file.replace(/^boilerplate\/(without-sample|new-project)\//, ""));
  }
  const markdownFiles = git(BOILERPLATE_ROOT, "ls-files", "--cached", "--others", "--exclude-standard", "*.md")
    .split("\n")
    .filter((file) => file !== "" && existsSync(join(BOILERPLATE_ROOT, file)));

  it("link only to files that exist", () => {
    const broken: string[] = [];
    for (const file of markdownFiles) {
      const text = readFileSync(join(BOILERPLATE_ROOT, file), "utf8");
      const folder = folderOfLinks(file);
      // [text](target) and ![text](target). A target with a protocol (https:, mailto:) is not a file.
      for (const match of text.matchAll(/\]\(([^)#\s]+)(#[^)]*)?\)/g)) {
        const target = match[1] ?? "";
        if (!/^[a-z]+:/.test(target) && !existsSync(join(BOILERPLATE_ROOT, folder, target))) {
          broken.push(`${file} links to ${target}`);
        }
      }
    }

    expect(markdownFiles.length).toBeGreaterThan(50);
    expect(broken).toEqual([]);
  });
});

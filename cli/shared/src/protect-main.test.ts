// Checks of scripts/protect-main.sh, the script that protects the branch main
// on GitHub. Each test runs the real script in a small git repository in a
// temporary folder, with a program "gh" of the test in the place of the real
// one. No test uses the network, and no test changes a repository on GitHub.
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { BOILERPLATE_ROOT, commitAll, git, newRepository, temporaryFolder, writeFiles } from "./testing";

const SCRIPT = "scripts/protect-main.sh";

const CHECK_WORKFLOW = [
  "name: Check",
  "on:",
  "  pull_request:",
  "    branches: [main]",
  "jobs:",
  "  # The one job of the check.",
  "  verify:",
  "    name: all checks",
  "    runs-on: ubuntu-latest",
  "  second:",
  "    name: another job",
  "",
].join("\n");

interface FakeGitHub {
  /** The folder that holds the program "gh". It goes first in PATH. */
  folder: string;
  calls: () => string;
  /** The text that the script sent to GitHub to create the ruleset, or "" when it sent nothing. */
  sentRuleset: () => string;
}

/**
 * A program "gh" that writes each call into a file. For a list of rulesets it prints `rulesetNames`,
 * or fails with `listError`. For a new ruleset it keeps the text it was given, or fails with `createError`.
 */
function fakeGitHub(answers: { rulesetNames?: string; listError?: string; createError?: string } = {}): FakeGitHub {
  const folder = temporaryFolder("fake-gh");
  writeFiles(folder, {
    gh: [
      "#!/usr/bin/env bash",
      `printf '%s\\n' "$*" >> "${folder}/calls.txt"`,
      'case "$*" in',
      '  *"--method POST"*)',
      `    cat > "${folder}/sent-ruleset.json"`,
      `    if [ -s "${folder}/create-error.txt" ]; then cat "${folder}/create-error.txt" >&2; exit 1; fi`,
      "    echo '{}' ;;",
      "  *)",
      `    if [ -s "${folder}/list-error.txt" ]; then cat "${folder}/list-error.txt" >&2; exit 1; fi`,
      `    cat "${folder}/ruleset-names.txt" ;;`,
      "esac",
      "",
    ].join("\n"),
    "calls.txt": "",
    "ruleset-names.txt": answers.rulesetNames ?? "",
    "list-error.txt": answers.listError ?? "",
    "create-error.txt": answers.createError ?? "",
  });
  chmodSync(join(folder, "gh"), 0o755);
  const sentFile = join(folder, "sent-ruleset.json");
  return {
    folder,
    calls: () => readFileSync(join(folder, "calls.txt"), "utf8"),
    sentRuleset: () => (existsSync(sentFile) ? readFileSync(sentFile, "utf8") : ""),
  };
}

/** A repository with the script and a check workflow. `originAddress` is the address of its remote "origin". */
function repositoryWith(originAddress: string | null, files: Record<string, string> = { ".github/workflows/check.yml": CHECK_WORKFLOW }): string {
  const repository = newRepository("repository");
  writeFiles(repository, { [SCRIPT]: readFileSync(join(BOILERPLATE_ROOT, SCRIPT), "utf8"), ...files });
  commitAll(repository, "first");
  if (originAddress !== null) {
    git(repository, "remote", "add", "origin", originAddress);
  }
  return repository;
}

interface ScriptResult {
  exitCode: number | null;
  output: string;
  errorOutput: string;
}

function runScript(repository: string, gitHub: FakeGitHub, scriptArguments: string[], input = ""): ScriptResult {
  const result = spawnSync("bash", [SCRIPT, ...scriptArguments], {
    cwd: repository,
    encoding: "utf8",
    input,
    env: { ...process.env, PATH: `${gitHub.folder}:${process.env.PATH ?? ""}` },
  });
  return { exitCode: result.status, output: result.stdout, errorOutput: result.stderr };
}

const SAMPLE_ADDRESS = "git@github.com:sample-owner/sample-shop.git";

describe("scripts/protect-main.sh --yes", () => {
  it("creates one ruleset for main: pull request with no approval, the check of the workflow, no force push, no deletion", () => {
    const repository = repositoryWith(SAMPLE_ADDRESS);
    const gitHub = fakeGitHub();

    const result = runScript(repository, gitHub, ["--yes"]);

    expect(result.errorOutput).toBe("");
    expect(result.exitCode).toBe(0);
    expect(gitHub.calls()).toContain("api --method POST repos/sample-owner/sample-shop/rulesets --input -");
    expect(JSON.parse(gitHub.sentRuleset())).toEqual({
      name: "protect-main",
      target: "branch",
      enforcement: "active",
      conditions: { ref_name: { include: ["refs/heads/main"], exclude: [] } },
      rules: [
        { type: "deletion" },
        { type: "non_fast_forward" },
        {
          type: "pull_request",
          parameters: {
            required_approving_review_count: 0,
            dismiss_stale_reviews_on_push: false,
            require_code_owner_review: false,
            require_last_push_approval: false,
            required_review_thread_resolution: false,
          },
        },
        {
          type: "required_status_checks",
          parameters: { strict_required_status_checks_policy: false, required_status_checks: [{ context: "all checks" }] },
        },
      ],
    });
    expect(result.output).toContain('This creates the ruleset "protect-main" in sample-owner/sample-shop, for the branch main:');
    expect(result.output).toContain('The check "all checks" (.github/workflows/check.yml) must pass before the merge.');
    expect(result.output).toContain('Created the ruleset "protect-main" in sample-owner/sample-shop.');
  });

  it("reads the repository from an https address, and uses the id of the job when the job has no name", () => {
    const repository = repositoryWith("https://github.com/sample-owner/sample-shop", {
      ".github/workflows/check.yml": "jobs:\n  check:\n    runs-on: ubuntu-latest\n",
    });
    const gitHub = fakeGitHub();

    const result = runScript(repository, gitHub, ["--yes"]);

    expect(result.exitCode).toBe(0);
    expect(gitHub.calls()).toContain("repos/sample-owner/sample-shop/rulesets");
    expect(gitHub.sentRuleset()).toContain('"required_status_checks": [ { "context": "check" } ]');
  });

  it("requires no check when the repository has no check workflow, and says so", () => {
    const repository = repositoryWith(SAMPLE_ADDRESS, {});
    const gitHub = fakeGitHub();

    const result = runScript(repository, gitHub, ["--yes"]);

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("No check is required: .github/workflows/check.yml does not exist or has no job.");
    expect(JSON.parse(gitHub.sentRuleset()).rules.map((rule: { type: string }) => rule.type)).toEqual([
      "deletion",
      "non_fast_forward",
      "pull_request",
    ]);
  });

  it("uses the repository of --repo", () => {
    const repository = repositoryWith(null);
    const gitHub = fakeGitHub();

    const result = runScript(repository, gitHub, ["--yes", "--repo", "other-owner/other-name"]);

    expect(result.exitCode).toBe(0);
    expect(gitHub.calls()).toContain("api --method POST repos/other-owner/other-name/rulesets --input -");
  });

  it("does nothing when a ruleset with the same name exists", () => {
    const repository = repositoryWith(SAMPLE_ADDRESS);
    const gitHub = fakeGitHub({ rulesetNames: "another-rule\nprotect-main\n" });

    const result = runScript(repository, gitHub, ["--yes"]);

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('sample-owner/sample-shop already has a ruleset named "protect-main". Nothing was changed.');
    expect(gitHub.calls()).not.toContain("POST");
  });

  it("says that the plan does not allow rulesets on a private repository, and creates nothing", () => {
    const repository = repositoryWith(SAMPLE_ADDRESS);
    const gitHub = fakeGitHub({
      listError: "gh: Upgrade to GitHub Pro or make this repository public to enable this feature. (HTTP 403)",
    });

    const result = runScript(repository, gitHub, ["--yes"]);

    expect(result.exitCode).toBe(1);
    expect(result.errorOutput).toContain("does not allow rulesets on a private repository");
    expect(result.errorOutput).toContain("Nothing was changed.");
    expect(gitHub.calls()).not.toContain("POST");
  });

  it("says why GitHub refused to create the ruleset", () => {
    const repository = repositoryWith(SAMPLE_ADDRESS);
    const gitHub = fakeGitHub({ createError: "gh: Validation Failed (HTTP 422)" });

    const result = runScript(repository, gitHub, ["--yes"]);

    expect(result.exitCode).toBe(1);
    expect(result.errorOutput).toContain("The ruleset was not created. GitHub answered: gh: Validation Failed (HTTP 422)");
  });

  it("stops when the repository is not on GitHub", () => {
    const repository = repositoryWith("git@gitlab.example.com:sample-owner/sample-shop.git");
    const gitHub = fakeGitHub();

    const result = runScript(repository, gitHub, ["--yes"]);

    expect(result.exitCode).toBe(1);
    expect(result.errorOutput).toContain('This repository has no remote "origin" on GitHub.');
    expect(gitHub.calls()).toBe("");
  });
});

describe("scripts/protect-main.sh with no --yes", () => {
  it("changes nothing where no question can be asked, and names the flag", () => {
    const repository = repositoryWith(SAMPLE_ADDRESS);
    const gitHub = fakeGitHub();

    const result = runScript(repository, gitHub, []);

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain("This creates the ruleset");
    expect(result.errorOutput).toContain("Nothing was changed: no question can be asked here. Run it again with --yes");
    expect(gitHub.calls()).not.toContain("POST");
  });
});

describe("scripts/protect-main.sh --status", () => {
  it.each([
    ["not-protected", "the repository has no ruleset", {}],
    ["protected", "the repository has a ruleset", { rulesetNames: "a-rule-of-the-owner\n" }],
    [
      "unknown: The command gh is not logged in. Run: gh auth login",
      "the command gh is not logged in",
      { listError: "To get started with GitHub CLI, please run:  gh auth login" },
    ],
  ])("prints %s when %s, and changes nothing", (expected, _when, answers) => {
    const repository = repositoryWith(SAMPLE_ADDRESS);
    const gitHub = fakeGitHub(answers);

    const result = runScript(repository, gitHub, ["--status"]);

    expect(result).toEqual({ exitCode: 0, output: `${expected}\n`, errorOutput: "" });
    expect(gitHub.calls()).not.toContain("POST");
  });

  it("prints no-github-remote when the repository has no remote, and does not call GitHub", () => {
    const repository = repositoryWith(null);
    const gitHub = fakeGitHub();

    const result = runScript(repository, gitHub, ["--status"]);

    expect(result).toEqual({ exitCode: 0, output: "no-github-remote\n", errorOutput: "" });
    expect(gitHub.calls()).toBe("");
  });
});

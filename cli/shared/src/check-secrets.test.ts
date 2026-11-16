// Checks of scripts/check-secrets.sh, the script that runs before each commit.
// Each test stages a file in a small git repository in a temporary folder and
// runs the real script there. Every name and every token in this file is invented.
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { BOILERPLATE_ROOT, git, newRepository, temporaryFolder, writeFiles } from "./testing";

const SCRIPT = "scripts/check-secrets.sh";

/** A file with private names, outside the repository, as local-docs/private-names.txt is outside git. */
function namesFileWith(content: string): string {
  const folder = temporaryFolder("names");
  writeFiles(folder, { "private-names.txt": content });
  return join(folder, "private-names.txt");
}

interface CheckResult {
  exitCode: number | null;
  errorOutput: string;
}

/** Stages the files in a new repository and runs the script, as the pre-commit hook does. */
function checkCommitOf(files: Record<string, string>, namesFile: string): CheckResult {
  const repository = newRepository("repository");
  writeFiles(repository, { [SCRIPT]: readFileSync(join(BOILERPLATE_ROOT, SCRIPT), "utf8") });
  git(repository, "add", "--all");
  git(repository, "commit", "--quiet", "--message", "first");
  writeFiles(repository, files);
  git(repository, "add", "--all");
  const result = spawnSync("bash", [SCRIPT], {
    cwd: repository,
    encoding: "utf8",
    env: { ...process.env, PRIVATE_NAMES_FILE: namesFile },
  });
  return { exitCode: result.status, errorOutput: result.stderr };
}

const noNamesFile = join(temporaryFolder("no-names"), "private-names.txt");

/** Runs the script on a repository, with the environment variables of the test. */
function runScript(repository: string, environment: Record<string, string> = {}): CheckResult {
  const result = spawnSync("bash", [SCRIPT], {
    cwd: repository,
    encoding: "utf8",
    env: { ...process.env, PRIVATE_NAMES_FILE: noNamesFile, ...environment },
  });
  return { exitCode: result.status, errorOutput: result.stderr };
}

/** A repository whose first commit holds the script and some files. */
function repositoryWith(files: Record<string, string>): string {
  const repository = newRepository("repository");
  writeFiles(repository, { [SCRIPT]: readFileSync(join(BOILERPLATE_ROOT, SCRIPT), "utf8"), ...files });
  git(repository, "add", "--all");
  git(repository, "commit", "--quiet", "--message", "first");
  return repository;
}

describe("scripts/check-secrets.sh: private names", () => {
  it("refuses a commit that adds a name of the names file, and does not print the name", () => {
    const namesFile = namesFileWith("# The names of private repositories\n\ninvented-private-shop\nSample Customer Ltd\n");

    const result = checkCommitOf({ "docs/notes.md": "The model is `Invented-Private-Shop`.\n" }, namesFile);

    expect(result.exitCode).toBe(1);
    expect(result.errorOutput).toContain("Refused: docs/notes.md adds a private name");
    expect(result.errorOutput).toContain(namesFile);
    expect(result.errorOutput.toLowerCase()).not.toContain("invented-private-shop");
  });

  it("refuses a file whose path holds a name", () => {
    const namesFile = namesFileWith("invented-private-shop\n");

    const result = checkCommitOf({ "docs/invented-private-shop.md": "A text with no name.\n" }, namesFile);

    expect(result.exitCode).toBe(1);
  });

  it("accepts a commit that adds no name of the names file", () => {
    const namesFile = namesFileWith("# A comment line\n\ninvented-private-shop\n");

    const result = checkCommitOf({ "docs/notes.md": "The model is an earlier private project.\n" }, namesFile);

    expect(result).toEqual({ exitCode: 0, errorOutput: "" });
  });

  it("checks only the secrets when the names file does not exist", () => {
    const result = checkCommitOf({ "docs/notes.md": "The model is `invented-private-shop`.\n" }, noNamesFile);

    expect(result).toEqual({ exitCode: 0, errorOutput: "" });
  });
});

describe("scripts/check-secrets.sh: secrets", () => {
  // Built from two parts, so that this file itself holds no text with the form of a token.
  const inventedToken = `ghp_${"a1B2".repeat(6)}`;

  it("refuses a commit that adds something with the form of a token", () => {
    const result = checkCommitOf({ "config.txt": `token=${inventedToken}\n` }, noNamesFile);

    expect(result.exitCode).toBe(1);
    expect(result.errorOutput).toContain("Refused: config.txt adds something that looks like a secret.");
  });

  it("finds a token in a long file, also when the token is in its first line", () => {
    const manyLines = Array.from({ length: 20000 }, (_unused, index) => `line ${index}`).join("\n");

    const result = checkCommitOf({ "config.txt": `token=${inventedToken}\n${manyLines}\n` }, noNamesFile);

    expect(result.exitCode).toBe(1);
  });

  // Each token is built from parts, as inventedToken above. [the start of the token, the rest]
  it.each([
    ["an npm token", "npm_", "a1B2".repeat(9)],
    ["a GitHub token of an app for a user", "ghu_", "a1B2".repeat(6)],
    ["a GitHub token of an app", "ghs_", "a1B2".repeat(6)],
    ["a GitHub refresh token", "ghr_", "a1B2".repeat(6)],
    ["a Stripe test key", "sk_test_", "a1B2".repeat(6)],
    ["a Stripe restricted key", "rk_live_", "a1B2".repeat(6)],
    ["a Stripe webhook secret", "whsec_", "a1B2".repeat(6)],
  ])("refuses %s", (_name, start, rest) => {
    const result = checkCommitOf({ "config.txt": `value: ${start}${rest}\n` }, noNamesFile);

    expect(result.exitCode).toBe(1);
    expect(result.errorOutput).toContain("Refused: config.txt adds something that looks like a secret.");
  });

  it.each([
    ["a password", "DATABASE_PASSWORD=", "Horse7Battery9"],
    ["a quoted secret", 'export CLIENT_SECRET="', 'Horse7Battery9"'],
    ["a token of a service that the script does not know", "SERVICE_TOKEN=", "Horse7Battery9Staple"],
    ["an API key", "  PAYMENT_API_KEY=", "Horse7Battery9"],
  ])("refuses a line that sets %s to a value", (_name, start, rest) => {
    const result = checkCommitOf({ "deploy.sh": `${start}${rest}\n` }, noNamesFile);

    expect(result.exitCode).toBe(1);
    expect(result.errorOutput).toContain(
      "Refused: deploy.sh adds a line that sets a password, a secret, a token or a key to a value.",
    );
  });

  it.each([
    ["a sample value", "SEED_ADMIN_PASSWORD=sample-admin-password-for-local-use"],
    ["a variable", 'NPM_PUBLISH_TOKEN="${NPM_PUBLISH_TOKEN}"'],
    ["a placeholder", "SERVICE_TOKEN=<the token of the service>"],
    ["a placeholder to paste over", "SERVICE_TOKEN=PASTE_THE_TOKEN_HERE"],
    ["an example address", "API_KEY_OWNER_EMAIL_SECRET=owner@example.com"],
    ["a short value", "TOKEN=abc"],
    ["a name that is not a secret", "POSTGRES_PORT=5433000000"],
    ["code that is not NAME=value", 'const PASSWORD = "Horse7Battery9";'],
  ])("accepts a line with %s", (_name, line) => {
    const result = checkCommitOf({ "deploy.sh": `${line}\n` }, noNamesFile);

    expect(result).toEqual({ exitCode: 0, errorOutput: "" });
  });

  it("refuses a binary file that holds something with the form of a token", () => {
    const repository = repositoryWith({});
    writeFileSync(
      join(repository, "picture.png"),
      Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 1, 2, 0]), Buffer.from(inventedToken), Buffer.from([0, 255])]),
    );
    git(repository, "add", "--all");

    const result = runScript(repository);

    expect(result.exitCode).toBe(1);
    expect(result.errorOutput).toContain("Refused: picture.png is a binary file that holds something that looks like a secret.");
  });

  it("accepts a binary file with no token", () => {
    const repository = repositoryWith({});
    writeFileSync(join(repository, "picture.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 1, 2, 0, 255]));
    git(repository, "add", "--all");

    expect(runScript(repository)).toEqual({ exitCode: 0, errorOutput: "" });
  });

  it("refuses a token in a file that the commit renames", () => {
    const repository = repositoryWith({});
    // The first commit is made without the script, as "git commit --no-verify" does.
    writeFiles(repository, { "old-name.txt": `token=${inventedToken}\n` });
    git(repository, "add", "--all");
    git(repository, "commit", "--quiet", "--message", "second");
    git(repository, "mv", "old-name.txt", "new-name.txt");

    const result = runScript(repository);

    expect(result.exitCode).toBe(1);
    expect(result.errorOutput).toContain("Refused: new-name.txt adds something that looks like a secret.");
  });

  it.each([["apps/api/.env"], ["apps/web/.env.local"], [".env.production"]])("refuses the env file %s", (file) => {
    const result = checkCommitOf({ [file]: "NAME=value\n" }, noNamesFile);

    expect(result.exitCode).toBe(1);
    expect(result.errorOutput).toContain(`Refused: ${file} is an env file and must not be committed.`);
  });

  it("accepts .env.example in a folder, and skips its lines", () => {
    const result = checkCommitOf({ "apps/api/.env.example": "SERVICE_TOKEN=Horse7Battery9Staple\n" }, noNamesFile);

    expect(result).toEqual({ exitCode: 0, errorOutput: "" });
  });

  it("refuses an env file", () => {
    const result = checkCommitOf({ ".env": "NAME=value\n" }, noNamesFile);

    expect(result.exitCode).toBe(1);
    expect(result.errorOutput).toContain("Refused: .env is an env file and must not be committed.");
  });
});

describe("scripts/check-secrets.sh: the commits of a pull request (CHECK_SECRETS_BASE)", () => {
  const inventedToken = `ghp_${"a1B2".repeat(6)}`;

  it("refuses a token that an earlier commit added without the hook", () => {
    const repository = repositoryWith({});
    const base = git(repository, "rev-parse", "HEAD").trim();
    writeFiles(repository, { "config.txt": `token=${inventedToken}\n` });
    git(repository, "add", "--all");
    git(repository, "commit", "--quiet", "--message", "second");
    writeFiles(repository, { "notes.txt": "a text\n" });
    git(repository, "add", "--all");
    git(repository, "commit", "--quiet", "--message", "third");

    // Nothing is staged: the check of the hook finds nothing.
    expect(runScript(repository)).toEqual({ exitCode: 0, errorOutput: "" });

    const result = runScript(repository, { CHECK_SECRETS_BASE: base });

    expect(result.exitCode).toBe(1);
    expect(result.errorOutput).toContain("Refused: config.txt adds something that looks like a secret.");
  });

  it("refuses an env file that an earlier commit added", () => {
    const repository = repositoryWith({});
    const base = git(repository, "rev-parse", "HEAD").trim();
    writeFiles(repository, { "apps/api/.env": "NAME=value\n" });
    git(repository, "add", "--all");
    git(repository, "commit", "--quiet", "--message", "second");

    const result = runScript(repository, { CHECK_SECRETS_BASE: base });

    expect(result.exitCode).toBe(1);
    expect(result.errorOutput).toContain("Refused: apps/api/.env is an env file");
  });

  it("accepts commits with no secret, and does not read what was there before the base", () => {
    const repository = repositoryWith({ "old.txt": `token=${inventedToken}\n` });
    const base = git(repository, "rev-parse", "HEAD").trim();
    writeFiles(repository, { "notes.txt": "a text\n" });
    git(repository, "add", "--all");
    git(repository, "commit", "--quiet", "--message", "second");

    expect(runScript(repository, { CHECK_SECRETS_BASE: base })).toEqual({ exitCode: 0, errorOutput: "" });
  });
});

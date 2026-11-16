// Helpers for the tests of the two commands. No command imports this file.
import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll } from "vitest";

/** The root folder of the boilerplate: the checkout that holds this file. */
export const BOILERPLATE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

// Every folder that a test file made. They are deleted when the test file ends.
const temporaryRoots: string[] = [];
afterAll(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

/**
 * A new empty folder for one test, in the temporary folder of the machine.
 * It is a folder inside a folder of its own, so that a test can also write
 * next to it (a worktree, for example) and everything is deleted together.
 */
export function temporaryFolder(label: string): string {
  const root = mkdtempSync(join(tmpdir(), "toraline-cli-"));
  temporaryRoots.push(root);
  const folder = join(root, label);
  mkdirSync(folder);
  return folder;
}

/** Runs git in a folder and returns what it printed. Throws when git fails. */
export function git(workingDirectory: string, ...gitArguments: string[]): string {
  return execFileSync("git", gitArguments, { cwd: workingDirectory, encoding: "utf8" });
}

/** Writes files into a folder. A key is a path inside the folder. */
export function writeFiles(rootDirectory: string, files: Record<string, string>): void {
  for (const [relativePath, content] of Object.entries(files)) {
    const filePath = join(rootDirectory, relativePath);
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, content);
  }
}

/** Commits every file of a folder, and puts a release tag on the commit when `version` is given. */
export function commitAll(rootDirectory: string, message: string, version?: string): void {
  git(rootDirectory, "add", "--all");
  git(rootDirectory, "commit", "--quiet", "--message", message);
  if (version !== undefined) {
    git(rootDirectory, "tag", `v${version}`);
  }
}

/** A new git repository in a temporary folder, on the branch main, with no commit. */
export function newRepository(label: string): string {
  const rootDirectory = temporaryFolder(label);
  git(rootDirectory, "init", "--quiet", "--initial-branch", "main");
  return rootDirectory;
}

/**
 * A git repository with the files of this checkout as they are now (also the
 * ones that are not committed yet, never the ones that git ignores), in one
 * commit with the release tag of boilerplate/VERSION. The tests use it as the
 * place to get the boilerplate from, so they need no network.
 */
export function templateRepositoryOfThisCheckout(): string {
  const rootDirectory = newRepository("template");
  const listed = git(BOILERPLATE_ROOT, "ls-files", "--cached", "--others", "--exclude-standard", "-z");
  // git names a link to a folder with "/" at the end. A file can be in the list twice.
  const relativePaths = new Set(listed.split("\0").map((listedPath) => listedPath.replace(/\/$/, "")));
  for (const relativePath of relativePaths) {
    const sourcePath = join(BOILERPLATE_ROOT, relativePath);
    // A file that was deleted and not committed yet is still in the list of git.
    if (relativePath === "" || !existsSync(sourcePath)) {
      continue;
    }
    const destinationPath = join(rootDirectory, relativePath);
    mkdirSync(dirname(destinationPath), { recursive: true });
    if (lstatSync(sourcePath).isSymbolicLink()) {
      symlinkSync(readlinkSync(sourcePath), destinationPath);
    } else {
      cpSync(sourcePath, destinationPath);
    }
  }
  const version = readFileSync(join(rootDirectory, "boilerplate", "VERSION"), "utf8").trim();
  commitAll(rootDirectory, "The boilerplate of this checkout", version);
  return rootDirectory;
}

/** Every file under a folder, as paths from that folder. Skips .git and node_modules. */
export function filesUnder(rootDirectory: string, folder = ""): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(join(rootDirectory, folder))) {
    const relativePath = folder === "" ? entry : `${folder}/${entry}`;
    if (entry === ".git" || entry === "node_modules") {
      continue;
    }
    if (statSync(join(rootDirectory, relativePath)).isDirectory()) {
      found.push(...filesUnder(rootDirectory, relativePath));
    } else {
      found.push(relativePath);
    }
  }
  return found;
}

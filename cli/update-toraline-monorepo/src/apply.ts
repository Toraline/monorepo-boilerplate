import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { fileAtReference, lastLine, runGit } from "../../shared/src/git";
import { pathInside } from "../../shared/src/paths";
import type { DependencyChange } from "../../shared/src/updates";
import { type PendingUpdate, referenceOf } from "./releases";

export interface ApplyContext {
  /** The folder where the update is applied: the checkout or the new worktree. */
  directory: string;
  /**
   * The fetched versions of the boilerplate that are older than the release of
   * the update, oldest first. A file of the project that equals the file of
   * one of them was not changed by the project.
   */
  olderVersions: string[];
  skipInstall: boolean;
  printLine: (line: string) => void;
}

export type ApplyOutcome =
  | { applied: true; changedFiles: string[]; notes: string[] }
  | { applied: false; reason: string };

function sameContent(first: Buffer | null, second: Buffer | null): boolean {
  if (first === null || second === null) {
    return first === second;
  }
  return first.equals(second);
}

function localContent(directory: string, filePath: string): Buffer | null {
  const fullPath = pathInside(directory, filePath);
  return existsSync(fullPath) && lstatSync(fullPath).isFile() ? readFileSync(fullPath) : null;
}

/** The files of a list of paths at some references. A path that ends with "/" is a folder. */
function expandFiles(directory: string, paths: string[], references: string[]): string[] {
  const files = new Set<string>();
  for (const listedPath of paths) {
    if (!listedPath.endsWith("/")) {
      files.add(listedPath);
      continue;
    }
    for (const reference of references) {
      const listed = runGit(["ls-tree", "-r", "--name-only", "-z", reference, "--", listedPath], directory);
      for (const filePath of listed.stdout.split("\0")) {
        if (filePath !== "") {
          files.add(filePath);
        }
      }
    }
  }
  return [...files].sort();
}

/** The file mode that git has for a file at a reference: "100644", "100755", or "120000" for a link. */
function modeAtReference(directory: string, reference: string, filePath: string): string {
  return runGit(["ls-tree", reference, "--", filePath], directory).stdout.split(" ")[0] ?? "";
}

const DIFFERENCE_LINE_LIMIT = 80;

/** Prints how a file of the project differs from the file of the release the project has. */
function printDifference(context: ApplyContext, filePath: string): void {
  const previousVersion = context.olderVersions.at(-1);
  if (previousVersion === undefined) {
    return;
  }
  const difference = runGit(
    ["diff", "--no-color", referenceOf(previousVersion), "--", filePath],
    context.directory,
  )
    .stdout.trimEnd()
    .split("\n");
  context.printLine(`    The difference between the boilerplate ${previousVersion} and your file ${filePath}:`);
  for (const line of difference.slice(0, DIFFERENCE_LINE_LIMIT)) {
    context.printLine(`      ${line}`);
  }
  if (difference.length > DIFFERENCE_LINE_LIMIT) {
    context.printLine(
      `      (${difference.length - DIFFERENCE_LINE_LIMIT} more lines: git diff ${referenceOf(previousVersion)} -- ${filePath})`,
    );
  }
}

/** Copies the files of a "core-files" update from its release, unless the project changed one of them. */
function applyCoreFiles(update: PendingUpdate, context: ApplyContext): ApplyOutcome {
  const newReference = referenceOf(update.release);
  const olderReferences = context.olderVersions.map(referenceOf);
  const files = expandFiles(context.directory, update.files, [newReference, ...olderReferences]);

  const writes: { filePath: string; content: Buffer | null }[] = [];
  const changedByProject: string[] = [];
  for (const filePath of files) {
    const newContent = fileAtReference(context.directory, newReference, filePath);
    const current = localContent(context.directory, filePath);
    if (sameContent(current, newContent)) {
      continue;
    }
    const isLink = modeAtReference(context.directory, newReference, filePath) === "120000";
    const unchangedByProject = olderReferences.some((reference) =>
      sameContent(current, fileAtReference(context.directory, reference, filePath)),
    );
    if (isLink || !unchangedByProject) {
      changedByProject.push(filePath);
    } else {
      writes.push({ filePath, content: newContent });
    }
  }

  if (changedByProject.length > 0) {
    context.printLine(
      `  Not applied: ${update.id}. Your project changed ${changedByProject.length} of its files. No file was overwritten.`,
    );
    for (const filePath of changedByProject) {
      printDifference(context, filePath);
    }
    return {
      applied: false,
      reason: `Your project changed these files, so the command did not overwrite them: ${changedByProject.join(", ")}. Merge the change of the boilerplate into each file by hand.`,
    };
  }

  for (const write of writes) {
    const fullPath = pathInside(context.directory, write.filePath);
    if (write.content === null) {
      rmSync(fullPath, { force: true });
      continue;
    }
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, write.content);
    const isExecutable = modeAtReference(context.directory, newReference, write.filePath) === "100755";
    chmodSync(fullPath, isExecutable ? 0o755 : 0o644);
  }
  return { applied: true, changedFiles: writes.map((write) => write.filePath), notes: [] };
}

function escapeForPattern(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The pattern of the line that holds the version of a dependency: in a package.json, or in a requirements file. */
function versionLinePattern(change: DependencyChange): RegExp {
  const name = escapeForPattern(change.name);
  return change.file.endsWith(".json")
    ? new RegExp(`^(\\s*"${name}"\\s*:\\s*")([^"]*)(".*)$`, "gm")
    : new RegExp(`^(${name}==)([^\\s;#]+)(.*)$`, "gm");
}

/** The new text of a file after one dependency change, or the reason why the change does not fit. */
function textWithDependency(text: string, change: DependencyChange): { text: string } | { problem: string } {
  const matches = [...text.matchAll(versionLinePattern(change))];
  if (matches.length === 0) {
    return { problem: `${change.file} does not name the dependency ${change.name}` };
  }
  const versions = matches.map((match) => match[2] ?? "");
  const unexpected = versions.find(
    (version) => version !== change.to && change.from !== undefined && version !== change.from,
  );
  if (unexpected !== undefined) {
    return {
      problem: `${change.file} has ${change.name} ${unexpected}; the update goes from ${change.from} to ${change.to}`,
    };
  }
  return { text: text.replace(versionLinePattern(change), `$1${change.to}$3`) };
}

const LOCK_FILE = "package-lock.json";

/** Writes the exact versions of a dependency update, then refreshes the lock file of npm. */
function applyDependencies(update: PendingUpdate, context: ApplyContext): ApplyOutcome {
  const originals = new Map<string, string>();
  const changed = new Map<string, string>();
  const problems: string[] = [];
  for (const change of update.dependencies ?? []) {
    const fullPath = pathInside(context.directory, change.file);
    if (!existsSync(fullPath)) {
      problems.push(`${change.file} does not exist`);
      continue;
    }
    if (!originals.has(change.file)) {
      originals.set(change.file, readFileSync(fullPath, "utf8"));
    }
    const result = textWithDependency(changed.get(change.file) ?? originals.get(change.file) ?? "", change);
    if ("problem" in result) {
      problems.push(result.problem);
    } else {
      changed.set(change.file, result.text);
    }
  }
  if (problems.length > 0) {
    context.printLine(`  Not applied: ${update.id}. ${problems.join("; ")}. No file was changed.`);
    return {
      applied: false,
      reason: `The versions of your project differ from what the update expects: ${problems.join("; ")}. Decide the version by hand.`,
    };
  }

  const changedFiles = [...changed.keys()].filter((file) => changed.get(file) !== originals.get(file));
  for (const file of changedFiles) {
    writeFileSync(pathInside(context.directory, file), changed.get(file) ?? "");
  }
  const notes: string[] = [];
  const needsLockFile =
    changedFiles.some((file) => file.endsWith("package.json")) && existsSync(join(context.directory, LOCK_FILE));
  if (needsLockFile && context.skipInstall) {
    notes.push(
      `${update.id}: ${LOCK_FILE} was not refreshed (--skip-install). Run "npm install --package-lock-only" and commit ${LOCK_FILE}.`,
    );
  }
  if (needsLockFile && !context.skipInstall) {
    context.printLine(`  Refreshing ${LOCK_FILE} with npm (it downloads nothing into node_modules).`);
    const install = spawnSync(
      "npm",
      ["install", "--package-lock-only", "--ignore-scripts", "--no-audit", "--no-fund"],
      { cwd: context.directory, encoding: "utf8" },
    );
    if (install.status !== 0) {
      for (const file of changedFiles) {
        writeFileSync(pathInside(context.directory, file), originals.get(file) ?? "");
      }
      runGit(["checkout", "--", LOCK_FILE], context.directory);
      const cause = lastLine(install.stderr ?? "") || install.error?.message || `npm ended with code ${install.status}`;
      context.printLine(`  Not applied: ${update.id}. npm could not refresh ${LOCK_FILE}: ${cause}. The files were restored.`);
      return {
        applied: false,
        reason: `npm could not refresh ${LOCK_FILE} (${cause}). Write the versions by hand, then run the install command of the project.`,
      };
    }
    if (runGit(["status", "--porcelain", "--", LOCK_FILE], context.directory).stdout.trim() !== "") {
      changedFiles.push(LOCK_FILE);
    }
  }
  return { applied: true, changedFiles, notes };
}

/** Applies one update that a program can apply. It changes files only; it makes no commit. */
export function applyUpdate(update: PendingUpdate, context: ApplyContext): ApplyOutcome {
  return update.kind === "core-files" ? applyCoreFiles(update, context) : applyDependencies(update, context);
}

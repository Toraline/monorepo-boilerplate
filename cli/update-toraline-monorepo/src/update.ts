import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

import { CommandError } from "../../shared/src/errors";
import { gitOutput, runGit } from "../../shared/src/git";
import { profileValue } from "../../shared/src/profile";
import { type Asker, yesOrNo } from "../../shared/src/prompt";
import {
  BOILERPLATE_NAME,
  type MonorepoRecord,
  readRecord,
  RECORD_FILE_NAME,
  todayAsText,
  writeRecord,
} from "../../shared/src/record";
import { findReachableSource, sourcesToTry } from "../../shared/src/source";
import { countOf } from "../../shared/src/text";
import { isAppliedByProgram } from "../../shared/src/updates";
import { compareVersions } from "../../shared/src/versions";
import { applyUpdate } from "./apply";
import { PLAN_FILE, type Selection, type UpdateOptions } from "./options";
import { type AppliedUpdate, type PlannedUpdate, planText } from "./plan";
import {
  deleteFetchedReferences,
  fetchReleases,
  listOfUpdates,
  newerVersions,
  type PendingUpdate,
  pendingUpdates,
  updatesOfRelease,
} from "./releases";

/** The exit code of "--check" when updates exist. 0 means none, 1 means an error. */
export const EXIT_UPDATES_EXIST = 2;

export interface UpdateRun {
  options: UpdateOptions;
  /** The folder the command was started in. */
  startDirectory: string;
  commandVersion: string;
  /** Called only when the person must choose the updates. */
  createAsker: () => Asker;
  printLine: (line: string) => void;
}

const NOT_A_REPOSITORY_HELP =
  "Run the command in the root folder of a monorepo that was created from the boilerplate.";

function rootOf(startDirectory: string): string {
  const result = runGit(["rev-parse", "--show-toplevel"], startDirectory);
  if (result.status !== 0) {
    throw new CommandError(`${startDirectory} is not inside a git repository.`, NOT_A_REPOSITORY_HELP);
  }
  return result.stdout.trim();
}

function noRecordError(rootDirectory: string): CommandError {
  return new CommandError(
    `${rootDirectory} has no record file (${RECORD_FILE_NAME}). The command cannot know which version of the boilerplate this repository has.`,
    `If this repository was started from the boilerplate before the record file existed: find the version of the boilerplate it was started from, then run "npx update-toraline-monorepo --init-record <version>" (for example 0.1.0) and commit the new file ${RECORD_FILE_NAME}. ` +
      "If it was not started from the boilerplate, this command is not for it.",
  );
}

/** Writes the record file of a repository that has none. It commits nothing. */
function initRecord(run: UpdateRun, rootDirectory: string, version: string): number {
  if (readRecord(rootDirectory) !== null) {
    throw new CommandError(
      `${RECORD_FILE_NAME} already exists in ${rootDirectory}. Nothing was changed.`,
      "Run the command with no --init-record.",
    );
  }
  const reachable = findReachableSource(sourcesToTry(run.options.source));
  if (!reachable.versions.includes(version)) {
    throw new CommandError(
      `The boilerplate has no release ${version}. Its releases: ${reachable.versions.join(", ") || "none"}.`,
      "Give one of these versions to --init-record.",
    );
  }
  const versionsUpTo = reachable.versions.filter((candidate) => compareVersions(candidate, version) <= 0);
  fetchReleases(rootDirectory, reachable.source, versionsUpTo);
  try {
    const appliedUpdates = versionsUpTo.flatMap((candidate) =>
      updatesOfRelease(rootDirectory, candidate).map((update) => update.id),
    );
    writeRecord(rootDirectory, {
      boilerplate: BOILERPLATE_NAME,
      createdFromVersion: version,
      createdOn: todayAsText(),
      appliedUpdates,
    });
  } finally {
    deleteFetchedReferences(rootDirectory);
  }
  run.printLine(`Wrote ${RECORD_FILE_NAME}: this repository counts as created from the boilerplate ${version}.`);
  run.printLine(`Next step: commit ${RECORD_FILE_NAME} the way this project commits a change. Then run: npx update-toraline-monorepo --check`);
  return 0;
}

async function chooseUpdates(
  selection: Selection,
  pending: PendingUpdate[],
  run: UpdateRun,
): Promise<PendingUpdate[]> {
  if (selection.kind === "all") {
    return pending;
  }
  if (selection.kind === "none") {
    return [];
  }
  if (selection.kind === "only") {
    const unknownIds = selection.ids.filter((updateId) => !pending.some((update) => update.id === updateId));
    if (unknownIds.length > 0) {
      throw new CommandError(
        `--only names ${unknownIds.join(", ")}, which is not in the list of the updates. Nothing was changed.`,
        `Give ids of this list: ${pending.map((update) => update.id).join(", ")}`,
      );
    }
    return pending.filter((update) => selection.ids.includes(update.id));
  }
  const asker = run.createAsker();
  try {
    let answer = "";
    while (!["all", "none", "choose"].includes(answer)) {
      answer = (await asker.ask('Which updates do you want? Type "all", "none" or "choose"', "all")).toLowerCase();
    }
    if (answer !== "choose") {
      return answer === "all" ? pending : [];
    }
    const chosen: PendingUpdate[] = [];
    for (const update of pending) {
      let take: boolean | null = null;
      while (take === null) {
        take = yesOrNo(await asker.ask(`Take ${update.id}: ${update.title}? (yes or no)`, "yes"));
      }
      if (take) {
        chosen.push(update);
      }
    }
    return chosen;
  } finally {
    asker.close();
  }
}

function refuseUncommittedChanges(rootDirectory: string): void {
  const changes = runGit(["status", "--porcelain"], rootDirectory)
    .stdout.split("\n")
    .filter((line) => line !== "");
  if (changes.length > 0) {
    const shown = changes.slice(0, 10).join("; ");
    throw new CommandError(
      `The working tree has ${countOf(changes.length, "change")} that ${changes.length === 1 ? "is" : "are"} not committed (${shown}). Nothing was changed.`,
      "Commit them or put them away (git stash --include-untracked), then run the command again.",
    );
  }
}

interface WorkFolder {
  directory: string;
  branch: string;
  isNewWorktree: boolean;
}

/** Creates the branch, or the worktree with the branch, where the updates are applied. Never the base branch. */
function prepareWorkFolder(run: UpdateRun, rootDirectory: string, newestVersion: string): WorkFolder {
  const agentsFile = join(rootDirectory, "AGENTS.md");
  const agentsText = existsSync(agentsFile) ? readFileSync(agentsFile, "utf8") : "";
  const baseBranch = profileValue(agentsText, "base_branch") || "main";
  const currentBranch = runGit(["branch", "--show-current"], rootDirectory).stdout.trim();

  if (run.options.currentBranch) {
    if (currentBranch === "" || [baseBranch, "main", "master"].includes(currentBranch)) {
      throw new CommandError(
        `--current-branch was given, and the branch that is checked out is ${currentBranch === "" ? "none (a detached commit)" : `"${currentBranch}", a base branch`}. The command never works there. Nothing was changed.`,
        "Run the command with no --current-branch: it creates a new branch.",
      );
    }
    return { directory: rootDirectory, branch: currentBranch, isNewWorktree: false };
  }

  const branch = run.options.branch ?? `boilerplate-update-${newestVersion}`;
  if (runGit(["show-ref", "--verify", "--quiet", `refs/heads/${branch}`], rootDirectory).status === 0) {
    throw new CommandError(
      `The branch "${branch}" already exists. Nothing was changed.`,
      `Give another name with --branch, or delete the old branch yourself when its work is merged (git branch -d ${branch}).`,
    );
  }
  const gitDirectory = runGit(["rev-parse", "--absolute-git-dir"], rootDirectory).stdout.trim();
  const commonDirectory = runGit(
    ["rev-parse", "--path-format=absolute", "--git-common-dir"],
    rootDirectory,
  ).stdout.trim();
  const isMainCheckout = gitDirectory === commonDirectory;
  const isProtected = profileValue(agentsText, "main_checkout") === "protected";
  if (run.options.worktree === undefined && !(isMainCheckout && isProtected)) {
    gitOutput(["switch", "--quiet", "--create", branch], rootDirectory, "Read the message of git above, correct the cause, and run the command again.");
    return { directory: rootDirectory, branch, isNewWorktree: false };
  }

  const worktreeDirectory = resolve(
    run.startDirectory,
    run.options.worktree ?? join(dirname(rootDirectory), `${basename(rootDirectory)}-boilerplate-update-${newestVersion}`),
  );
  if (existsSync(worktreeDirectory)) {
    throw new CommandError(
      `The folder ${worktreeDirectory} already exists, so the worktree cannot be created there. Nothing was changed.`,
      "Give another folder with --worktree.",
    );
  }
  gitOutput(
    ["worktree", "add", "--quiet", "-b", branch, worktreeDirectory],
    rootDirectory,
    "Read the message of git above, correct the cause, and run the command again.",
  );
  return { directory: worktreeDirectory, branch, isNewWorktree: true };
}

function commitUpdate(directory: string, update: PendingUpdate, changedFiles: string[]): string {
  const help =
    "Read the message above. When a check before the commit refused it, correct the cause. " +
    `The files of the update ${update.id} are changed and not committed in ${directory}.`;
  gitOutput(["add", "--", ...changedFiles, RECORD_FILE_NAME], directory, help);
  gitOutput(
    ["commit", "--quiet", "--message", `chore(boilerplate): ${update.title} (update ${update.id})`],
    directory,
    help,
  );
  return runGit(["rev-parse", "--short", "HEAD"], directory).stdout.trim();
}

/** Runs the command and returns its exit code. */
export async function runUpdate(run: UpdateRun): Promise<number> {
  const { options, printLine } = run;
  const rootDirectory = rootOf(run.startDirectory);
  if (options.initRecord !== undefined) {
    return initRecord(run, rootDirectory, options.initRecord);
  }
  const record = readRecord(rootDirectory);
  if (record === null) {
    throw noRecordError(rootDirectory);
  }

  const reachable = findReachableSource(sourcesToTry(options.source));
  const newer = newerVersions(record, reachable.versions);
  printLine(
    `This monorepo was created from the boilerplate ${record.createdFromVersion} and has ${countOf(record.appliedUpdates.length, "update")}.`,
  );
  if (newer.length === 0) {
    printLine(`The boilerplate has no release newer than ${record.createdFromVersion}. Nothing to update.`);
    return 0;
  }
  // The version the monorepo was created from is fetched too: the command
  // compares the files of the project with it, to see what the project changed.
  const fetched = reachable.versions.filter(
    (version) => compareVersions(version, record.createdFromVersion) >= 0,
  );
  fetchReleases(rootDirectory, reachable.source, fetched);

  let keepReferences = false;
  try {
    const pending = pendingUpdates(rootDirectory, record, reachable.versions);
    if (pending.length === 0) {
      printLine(`This monorepo has every update of the newer releases (${newer.join(", ")}). Nothing to update.`);
      return 0;
    }
    printLine(
      `The boilerplate has ${countOf(newer.length, "newer release")} (${newer.join(", ")}) with ${countOf(pending.length, "update")} that this monorepo does not have:`,
    );
    for (const line of listOfUpdates(pending)) {
      printLine(line);
    }
    printLine("");
    if (options.check) {
      printLine("Nothing was changed (--check). To take updates: npx update-toraline-monorepo");
      return EXIT_UPDATES_EXIST;
    }

    const chosen = await chooseUpdates(options.selection, pending, run);
    if (chosen.length === 0) {
      printLine("No update was chosen. Nothing was changed.");
      return 0;
    }
    refuseUncommittedChanges(rootDirectory);
    const newestVersion = newer.at(-1) ?? record.createdFromVersion;
    const workFolder = prepareWorkFolder(run, rootDirectory, newestVersion);
    printLine(
      workFolder.isNewWorktree
        ? `Created the worktree ${workFolder.directory} with the new branch "${workFolder.branch}".`
        : `Working on the branch "${workFolder.branch}" in ${workFolder.directory}.`,
    );

    const applied: AppliedUpdate[] = [];
    const planned: PlannedUpdate[] = [];
    const notes: string[] = [];
    const currentRecord: MonorepoRecord = { ...record, appliedUpdates: [...record.appliedUpdates] };
    for (const update of chosen) {
      if (!isAppliedByProgram(update)) {
        planned.push({ update, reason: "The release says that an agent or a person applies this update, not a program." });
        continue;
      }
      const outcome = applyUpdate(update, {
        directory: workFolder.directory,
        olderVersions: fetched.filter((version) => compareVersions(version, update.release) < 0),
        skipInstall: options.skipInstall,
        printLine,
      });
      if (!outcome.applied) {
        planned.push({ update, reason: outcome.reason });
        continue;
      }
      currentRecord.appliedUpdates.push(update.id);
      writeRecord(workFolder.directory, currentRecord);
      const commit = commitUpdate(workFolder.directory, update, outcome.changedFiles);
      applied.push({ update, commit });
      notes.push(...outcome.notes);
      printLine(`  Applied: ${update.id} (commit ${commit}, ${countOf(outcome.changedFiles.length, "file")}).`);
    }

    const planFile = join(workFolder.directory, PLAN_FILE);
    mkdirSync(dirname(planFile), { recursive: true });
    writeFileSync(
      planFile,
      planText({
        commandVersion: run.commandVersion,
        date: todayAsText(),
        branch: workFolder.branch,
        fromVersion: record.createdFromVersion,
        toVersion: newestVersion,
        recordFile: RECORD_FILE_NAME,
        applied,
        planned,
        notes,
      }),
    );
    keepReferences = planned.length > 0;

    printLine("");
    printLine(`Applied and committed: ${countOf(applied.length, "update")}. Left for the plan: ${countOf(planned.length, "update")}.`);
    printLine(`The plan file: ${planFile}`);
    if (runGit(["check-ignore", "--quiet", PLAN_FILE], workFolder.directory).status !== 0) {
      printLine(`Warning: git does not ignore ${PLAN_FILE} in this project. Do not commit it; add "local-docs/" to .gitignore.`);
    }
    for (const note of notes) {
      printLine(`Note: ${note}`);
    }
    printLine("Nothing was pushed. No pull request and no ticket was created.");
    printLine(
      `Next step: open ${workFolder.directory} in Claude Code or Cursor and type /update-boilerplate. The skill creates the tickets, does the updates of the plan, runs the checks and opens the pull request.`,
    );
    return 0;
  } finally {
    if (!keepReferences) {
      deleteFetchedReferences(rootDirectory);
    }
  }
}

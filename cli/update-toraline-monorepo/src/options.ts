import { parseArgs } from "node:util";

import { CommandError } from "../../shared/src/errors";
import { RECORD_FILE_NAME } from "../../shared/src/record";
import { SOURCE_ENVIRONMENT_VARIABLE } from "../../shared/src/source";
import { isVersion } from "../../shared/src/versions";

/** Which updates to take: every one, no one, the ones of a list, or ask the person. */
export type Selection = { kind: "all" } | { kind: "none" } | { kind: "only"; ids: string[] } | { kind: "ask" };

export interface UpdateOptions {
  /** Only list the updates; change nothing. */
  check: boolean;
  selection: Selection;
  /** The name of the new branch. Undefined gives boilerplate-update-<newest version>. */
  branch: string | undefined;
  /** Work on the branch that is checked out, and create none. */
  currentBranch: boolean;
  /** Create a worktree in this folder for the new branch. */
  worktree: string | undefined;
  /** Do not refresh package-lock.json after a change of a package.json. */
  skipInstall: boolean;
  /** Write the record file for a repository that has none, as created from this version. */
  initRecord: string | undefined;
  source: string | undefined;
}

export const PLAN_FILE = "local-docs/boilerplate-update/plan.md";

export const HELP_TEXT = `update-toraline-monorepo: finds the updates of the Toraline monorepo boilerplate that this monorepo does not have, and applies the ones that a program can apply.

Usage, in the root folder of the monorepo:
  npx update-toraline-monorepo [flags]

With no flag, the command lists the updates and asks which ones you want.
For a run with no question (an agent, a script): --yes, or one of --all, --none, --only.

Flags:
  --check                  Only list the updates. Change nothing.
                           Exit code 0: no update exists. Exit code 2: updates exist. Exit code 1: an error.
  --all                    Take every update. Ask no question.
  --none                   Take no update. Ask no question.
  --only <id,id>           Take only the updates with these ids, separated by commas. Ask no question.
  --yes, -y                Ask no question. With no --none and no --only, it means --all.
  --branch <name>          The name of the new branch. Default: boilerplate-update-<newest version>
  --current-branch         Work on the branch that is checked out, and create no branch.
                           Refused on the base branch of the project profile (base_branch in AGENTS.md).
  --worktree <folder>      Create the new branch in a worktree in this folder.
                           Default: a worktree is created only when you are in the main checkout and the
                           project profile says main_checkout is protected. Its folder is then
                           ../<this folder>-boilerplate-update-<newest version>
  --skip-install           After a dependency update, do not run npm to refresh package-lock.json.
  --init-record <version>  For a repository that has no ${RECORD_FILE_NAME}: write that file, as created
                           from this version of the boilerplate (for example 0.1.0). It commits nothing.
  --source <where>         Where to get the boilerplate from: a folder of this machine or a git address.
                           Default: Toraline/monorepo-boilerplate on GitHub, with your git login.
                           The environment variable ${SOURCE_ENVIRONMENT_VARIABLE} does the same.
  --version, -v            Print the version of this command.
  --help, -h               Print this text.

What it does: it refuses to run when the working tree has changes that are not committed. It creates a
new branch (or a worktree). It applies each update that a program can apply, one commit per update. It
never overwrites a file that your project changed: it shows the difference and leaves that update for the
plan. It writes every other chosen update into ${PLAN_FILE}.

It never pushes, never opens a pull request and never writes to a ticket tool.
The next step after it: in Claude Code or Cursor, the skill /update-boilerplate.
`;

export type ParsedArguments = { kind: "help" } | { kind: "version" } | { kind: "update"; options: UpdateOptions };

const USAGE_HELP = 'Run "npx update-toraline-monorepo --help" to see every flag.';

export function readOptions(commandArguments: string[]): ParsedArguments {
  let parsed;
  try {
    parsed = parseArgs({
      args: commandArguments,
      allowPositionals: false,
      options: {
        check: { type: "boolean" },
        all: { type: "boolean" },
        none: { type: "boolean" },
        only: { type: "string" },
        yes: { type: "boolean", short: "y" },
        branch: { type: "string" },
        "current-branch": { type: "boolean" },
        worktree: { type: "string" },
        "skip-install": { type: "boolean" },
        "init-record": { type: "string" },
        source: { type: "string" },
        version: { type: "boolean", short: "v" },
        help: { type: "boolean", short: "h" },
      },
    });
  } catch (error) {
    throw new CommandError(error instanceof Error ? error.message : String(error), USAGE_HELP);
  }
  const flags = parsed.values;
  if (flags.help) {
    return { kind: "help" };
  }
  if (flags.version) {
    return { kind: "version" };
  }
  const selectionFlags = [flags.all, flags.none, flags.only !== undefined].filter(Boolean).length;
  if (selectionFlags > 1) {
    throw new CommandError("More than one of --all, --none and --only was given.", "Give only one of the three.");
  }
  const branchFlags = [flags.branch !== undefined || flags.worktree !== undefined, flags["current-branch"]].filter(
    Boolean,
  ).length;
  if (branchFlags > 1) {
    throw new CommandError(
      "--current-branch was given together with --branch or --worktree.",
      "Give --current-branch alone, or --branch and --worktree without it.",
    );
  }
  const initRecord = flags["init-record"];
  if (initRecord !== undefined && !isVersion(initRecord)) {
    throw new CommandError(
      `"${initRecord}" is not a version of the boilerplate.`,
      "Give three numbers, for example: --init-record 0.1.0",
    );
  }

  let selection: Selection = flags.yes ? { kind: "all" } : { kind: "ask" };
  if (flags.all) {
    selection = { kind: "all" };
  }
  if (flags.none) {
    selection = { kind: "none" };
  }
  if (flags.only !== undefined) {
    const ids = flags.only
      .split(",")
      .map((updateId) => updateId.trim())
      .filter((updateId) => updateId !== "");
    if (ids.length === 0) {
      throw new CommandError("--only was given with no id.", "Give the ids separated by commas. --check lists them.");
    }
    selection = { kind: "only", ids };
  }
  return {
    kind: "update",
    options: {
      check: flags.check ?? false,
      selection,
      branch: flags.branch,
      currentBranch: flags["current-branch"] ?? false,
      worktree: flags.worktree,
      skipInstall: flags["skip-install"] ?? false,
      initRecord,
      source: flags.source,
    },
  };
}

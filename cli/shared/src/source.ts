import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { CommandError } from "./errors";
import { lastLine, runGit } from "./git";
import { sortVersions, versionOfTag } from "./versions";

/** The environment variable that names another place to get the boilerplate from. */
export const SOURCE_ENVIRONMENT_VARIABLE = "TORALINE_BOILERPLATE_SOURCE";

/**
 * Where the boilerplate is, when no flag and no environment variable names
 * another place. The first address uses the login of the GitHub CLI or of a
 * credential helper; the second uses an SSH key.
 */
export const DEFAULT_SOURCES = [
  "https://github.com/Toraline/monorepo-boilerplate.git",
  "git@github.com:Toraline/monorepo-boilerplate.git",
];

/** The places to try, in order: the flag, else the environment variable, else GitHub. */
export function sourcesToTry(
  flagValue: string | undefined,
  environment: NodeJS.ProcessEnv = process.env,
): string[] {
  const chosen = flagValue ?? environment[SOURCE_ENVIRONMENT_VARIABLE];
  if (!chosen) {
    return DEFAULT_SOURCES;
  }
  // A folder of this machine is given to git as a full path.
  return [existsSync(chosen) ? resolve(chosen) : chosen];
}

export interface ReachableSource {
  source: string;
  /** The versions that have a release tag, from the oldest to the newest. */
  versions: string[];
}

const SOURCE_HELP =
  'Check that git can read the boilerplate: "git ls-remote https://github.com/Toraline/monorepo-boilerplate.git". ' +
  'If it asks for a login or says "not found": run "gh auth login", then "gh auth setup-git", and run the command again. ' +
  "With no network: give a local copy of the boilerplate with --source <folder>.";

/** Asks each place for its release tags and returns the first place that answers. */
export function findReachableSource(candidates: string[]): ReachableSource {
  const failures: string[] = [];
  for (const source of candidates) {
    const result = runGit(["ls-remote", "--tags", "--refs", source]);
    if (result.status === 0) {
      const versions = result.stdout
        .split("\n")
        .map((line) => versionOfTag(line.split("refs/tags/")[1] ?? ""))
        .filter((version): version is string => version !== null);
      return { source, versions: sortVersions(versions) };
    }
    failures.push(`${source}: ${lastLine(result.stderr) || `git ended with code ${result.status}`}`);
  }
  throw new CommandError(
    `The boilerplate could not be read. ${failures.join(" | ")}`,
    SOURCE_HELP,
  );
}

export { SOURCE_HELP };

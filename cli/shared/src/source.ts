import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { CommandError } from "./errors";
import { lastLine, refuseOptionValue, runGit } from "./git";
import { sortVersions, versionOfTag } from "./versions";

/** The environment variable that names another place to get the boilerplate from. */
export const SOURCE_ENVIRONMENT_VARIABLE = "TORALINE_BOILERPLATE_SOURCE";

/**
 * Where the boilerplate is, when no flag and no environment variable names
 * another place. The boilerplate is public, so the first address needs no
 * login. The second is tried when the first fails, and uses an SSH key.
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
  const flagName = flagValue === undefined ? SOURCE_ENVIRONMENT_VARIABLE : "--source";
  refuseOptionValue(flagName, chosen);
  // A folder of this machine is given to git as a full path.
  return [existsSync(chosen) ? resolve(chosen) : chosen];
}

export interface ReachableSource {
  source: string;
  /** The versions that have a release tag, from the oldest to the newest. */
  versions: string[];
}

const SOURCE_HELP =
  'Check that git can read the boilerplate: "git ls-remote --tags https://github.com/Toraline/monorepo-boilerplate.git" must print one line per release. ' +
  "The boilerplate is public: it needs the network and no login. " +
  "With no network: give a local copy of the boilerplate with --source <folder>.";

/** Asks each place for its release tags and returns the first place that answers. */
export function findReachableSource(candidates: string[]): ReachableSource {
  const failures: string[] = [];
  for (const source of candidates) {
    refuseOptionValue("the source", source);
    // "--": what follows is an address, never an option of git.
    const result = runGit(["ls-remote", "--tags", "--refs", "--", source]);
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

import { CommandError } from "../../shared/src/errors";
import { fileAtReference, gitOutput, refuseOptionValue, runGit } from "../../shared/src/git";
import type { MonorepoRecord } from "../../shared/src/record";
import { SOURCE_HELP } from "../../shared/src/source";
import {
  type BoilerplateUpdate,
  parseReleaseUpdates,
  type UpdateKind,
  UPDATE_KINDS,
  updatesFileOf,
} from "../../shared/src/updates";
import { compareVersions, releaseTag } from "../../shared/src/versions";

/**
 * The command fetches the release tags of the boilerplate into this group of
 * references of the monorepo's own repository. git never pushes them, and no
 * branch holds them. A file of a release is then read with "git show".
 */
export const REFERENCE_PREFIX = "refs/toraline-boilerplate";

export function referenceOf(version: string): string {
  return `${REFERENCE_PREFIX}/${releaseTag(version)}`;
}

/** Fetches the release tags of some versions into the references of the command. */
export function fetchReleases(rootDirectory: string, source: string, versions: string[]): void {
  if (versions.length === 0) {
    return;
  }
  const referencePairs = versions.map((version) => `+refs/tags/${releaseTag(version)}:${referenceOf(version)}`);
  refuseOptionValue("the source", source);
  // "--": what follows is the address and the tags, never an option of git.
  gitOutput(["fetch", "--quiet", "--no-tags", "--", source, ...referencePairs], rootDirectory, SOURCE_HELP);
}

/** Deletes every reference that the command fetched. The branches and the files of the monorepo do not change. */
export function deleteFetchedReferences(rootDirectory: string): void {
  const references = runGit(["for-each-ref", "--format=%(refname)", REFERENCE_PREFIX], rootDirectory)
    .stdout.split("\n")
    .filter((reference) => reference !== "");
  for (const reference of references) {
    runGit(["update-ref", "-d", reference], rootDirectory);
  }
}

/** One update, with the version of the release that holds it. */
export interface PendingUpdate extends BoilerplateUpdate {
  release: string;
}

/** The updates of one fetched release. */
export function updatesOfRelease(rootDirectory: string, version: string): PendingUpdate[] {
  const content = fileAtReference(rootDirectory, referenceOf(version), updatesFileOf(version));
  if (content === null) {
    throw new CommandError(
      `The release ${version} of the boilerplate has no updates file (${updatesFileOf(version)}).`,
      "Report this to the owner of the boilerplate. The command changed nothing.",
    );
  }
  try {
    return parseReleaseUpdates(content.toString("utf8"), version).updates.map((update) => ({
      ...update,
      release: version,
    }));
  } catch (error) {
    throw new CommandError(
      error instanceof Error ? error.message : String(error),
      "Report this to the owner of the boilerplate. The command changed nothing.",
    );
  }
}

/** The versions that are newer than the version the monorepo was created from, oldest first. */
export function newerVersions(record: MonorepoRecord, versions: string[]): string[] {
  return versions.filter((version) => compareVersions(version, record.createdFromVersion) > 0);
}

/** The updates of the newer releases that the monorepo does not have, oldest release first. */
export function pendingUpdates(
  rootDirectory: string,
  record: MonorepoRecord,
  versions: string[],
): PendingUpdate[] {
  return newerVersions(record, versions)
    .flatMap((version) => updatesOfRelease(rootDirectory, version))
    .filter((update) => !record.appliedUpdates.includes(update.id));
}

/** The list of the updates for a person: one group per kind, one line per update. */
export function listOfUpdates(updates: PendingUpdate[]): string[] {
  const lines: string[] = [];
  for (const kind of Object.keys(UPDATE_KINDS) as UpdateKind[]) {
    const updatesOfKind = updates.filter((update) => update.kind === kind);
    if (updatesOfKind.length === 0) {
      continue;
    }
    lines.push("", `${UPDATE_KINDS[kind]}:`);
    for (const update of updatesOfKind) {
      const who = update.appliedBy === "program" ? "the command applies it" : "it goes into the plan for an agent";
      lines.push(`  - ${update.id}: ${update.title} (release ${update.release}; ${who})`);
    }
  }
  return lines;
}

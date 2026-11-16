import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { CommandError } from "./errors";
import { isVersion } from "./versions";

/** The record file of a monorepo that was created from the boilerplate. It is in the root folder. */
export const RECORD_FILE_NAME = ".toraline-monorepo.json";

/** The name of the boilerplate on GitHub, written into each record file. */
export const BOILERPLATE_NAME = "Toraline/monorepo-boilerplate";

export interface MonorepoRecord {
  /** The repository that the monorepo was created from. */
  boilerplate: string;
  /** The version of the boilerplate that the monorepo was created from. */
  createdFromVersion: string;
  /** The day the monorepo was created, as YYYY-MM-DD. */
  createdOn: string;
  /** The ids of the updates that the monorepo already has. */
  appliedUpdates: string[];
}

/** Today as YYYY-MM-DD, in the time zone of the machine. */
export function todayAsText(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function recordAsText(record: MonorepoRecord): string {
  return `${JSON.stringify(record, null, 2)}\n`;
}

export function writeRecord(rootDirectory: string, record: MonorepoRecord): void {
  writeFileSync(join(rootDirectory, RECORD_FILE_NAME), recordAsText(record));
}

const BROKEN_RECORD_HELP = `Open ${RECORD_FILE_NAME} and correct it. Its format is in docs/boilerplate-version.md of the boilerplate.`;

/** Reads the record file of a monorepo. Returns null when the folder has none. */
export function readRecord(rootDirectory: string): MonorepoRecord | null {
  const filePath = join(rootDirectory, RECORD_FILE_NAME);
  if (!existsSync(filePath)) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    throw new CommandError(`${RECORD_FILE_NAME} is not valid JSON.`, BROKEN_RECORD_HELP);
  }
  const record = parsed as Partial<MonorepoRecord>;
  const createdFromVersion = record.createdFromVersion;
  if (typeof createdFromVersion !== "string" || !isVersion(createdFromVersion)) {
    throw new CommandError(
      `${RECORD_FILE_NAME} has no valid "createdFromVersion" (three numbers, for example 0.1.0).`,
      BROKEN_RECORD_HELP,
    );
  }
  const appliedUpdates = record.appliedUpdates;
  const hasValidUpdates =
    Array.isArray(appliedUpdates) && appliedUpdates.every((updateId) => typeof updateId === "string");
  if (!hasValidUpdates) {
    throw new CommandError(
      `${RECORD_FILE_NAME} has no valid "appliedUpdates" (a list of update ids).`,
      BROKEN_RECORD_HELP,
    );
  }
  return {
    boilerplate: typeof record.boilerplate === "string" ? record.boilerplate : BOILERPLATE_NAME,
    createdFromVersion,
    createdOn: typeof record.createdOn === "string" ? record.createdOn : "",
    appliedUpdates: appliedUpdates as string[],
  };
}

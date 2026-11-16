import { isVersion } from "./versions";

/** The file of the boilerplate that holds its version. */
export const VERSION_FILE = "boilerplate/VERSION";

/** The folder of the boilerplate with one updates file per release: `<version>.json`. */
export const UPDATES_FOLDER = "boilerplate/updates";

export function updatesFileOf(version: string): string {
  return `${UPDATES_FOLDER}/${version}.json`;
}

/** The five kinds of update, and the title each has in a list for a person. */
export const UPDATE_KINDS = {
  "core-files": "Core files (the way of working with agents: agent/, scripts/)",
  "dependency-versions": "Dependency versions",
  security: "Security",
  "new-feature": "New features",
  "manual-change": "Manual changes",
} as const;

export type UpdateKind = keyof typeof UPDATE_KINDS;

/** One exact version of one dependency in one file. */
export interface DependencyChange {
  /** The file that names the dependency: a package.json, or a requirements file of Python. */
  file: string;
  name: string;
  /** The version before the update. With it, the command sees that the project chose another version. */
  from?: string;
  /** The version after the update. */
  to: string;
}

export interface BoilerplateUpdate {
  id: string;
  title: string;
  kind: UpdateKind;
  /** "program": the update command applies it. "agent": it goes into the plan file. */
  appliedBy: "program" | "agent";
  /** The files and folders that the update touches. A folder ends with "/". */
  files: string[];
  /** What a person or an agent does to apply the update by hand. */
  whatToDo: string;
  /** Only for the kinds "dependency-versions" and "security" that a program applies. */
  dependencies?: DependencyChange[];
}

export interface ReleaseUpdates {
  version: string;
  /** The day of the release, as YYYY-MM-DD. */
  date: string;
  /** The value of agent/CORE_VERSION in this release. */
  coreVersion: string;
  updates: BoilerplateUpdate[];
}

function isText(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function problemsOfDependency(change: Partial<DependencyChange>, where: string): string[] {
  const problems: string[] = [];
  for (const key of ["file", "name", "to"] as const) {
    if (!isText(change[key])) {
      problems.push(`${where}: "${key}" is missing.`);
    }
  }
  return problems;
}

function problemsOfUpdate(update: Partial<BoilerplateUpdate>, version: string, where: string): string[] {
  const problems: string[] = [];
  if (!isText(update.id) || !update.id.startsWith(`${version}-`)) {
    problems.push(`${where}: "id" must start with "${version}-".`);
  }
  for (const key of ["title", "whatToDo"] as const) {
    if (!isText(update[key])) {
      problems.push(`${where}: "${key}" is missing.`);
    }
  }
  if (!update.kind || !(update.kind in UPDATE_KINDS)) {
    problems.push(`${where}: "kind" must be one of: ${Object.keys(UPDATE_KINDS).join(", ")}.`);
  }
  if (update.appliedBy !== "program" && update.appliedBy !== "agent") {
    problems.push(`${where}: "appliedBy" must be "program" or "agent".`);
  }
  const files = update.files;
  if (!Array.isArray(files) || !files.every(isText)) {
    problems.push(`${where}: "files" must be a list of paths.`);
  } else if (files.some((filePath) => filePath.startsWith("/") || filePath.split("/").includes(".."))) {
    problems.push(`${where}: a path of "files" must stay inside the repository.`);
  }
  const dependencies = update.dependencies ?? [];
  dependencies.forEach((change, position) => {
    problems.push(...problemsOfDependency(change, `${where}, dependency ${position + 1}`));
  });
  if (update.appliedBy === "program") {
    const isCoreFiles = update.kind === "core-files" && Array.isArray(files) && files.length > 0;
    const isDependencies =
      (update.kind === "dependency-versions" || update.kind === "security") && dependencies.length > 0;
    if (!isCoreFiles && !isDependencies) {
      problems.push(
        `${where}: a program can apply only the kind "core-files" with "files", and the kinds "dependency-versions" and "security" with "dependencies".`,
      );
    }
  }
  return problems;
}

/** Every problem of the content of one updates file. An empty list means the file is valid. */
export function problemsOfReleaseUpdates(content: unknown, expectedVersion: string): string[] {
  const release = (content ?? {}) as Partial<ReleaseUpdates>;
  const problems: string[] = [];
  if (release.version !== expectedVersion) {
    problems.push(`"version" must be "${expectedVersion}", the name of the file.`);
  }
  if (!isText(release.date) || !/^\d{4}-\d{2}-\d{2}$/.test(release.date)) {
    problems.push('"date" must be a day as YYYY-MM-DD.');
  }
  if (!isText(release.coreVersion) || !isVersion(release.coreVersion)) {
    problems.push('"coreVersion" must be a version, for example 0.1.8.');
  }
  if (!Array.isArray(release.updates) || release.updates.length === 0) {
    problems.push('"updates" must be a list with one update or more.');
    return problems;
  }
  const seenIds = new Set<string>();
  release.updates.forEach((update, position) => {
    const where = `update ${position + 1}`;
    problems.push(...problemsOfUpdate(update, expectedVersion, where));
    if (isText(update.id) && seenIds.has(update.id)) {
      problems.push(`${where}: the id "${update.id}" is used twice.`);
    }
    seenIds.add(update.id);
  });
  return problems;
}

/** Reads the text of one updates file. Throws an Error that lists every problem. */
export function parseReleaseUpdates(text: string, expectedVersion: string): ReleaseUpdates {
  let content: unknown;
  try {
    content = JSON.parse(text);
  } catch {
    throw new Error(`The updates file of version ${expectedVersion} is not valid JSON.`);
  }
  const problems = problemsOfReleaseUpdates(content, expectedVersion);
  if (problems.length > 0) {
    throw new Error(`The updates file of version ${expectedVersion} is not valid: ${problems.join(" ")}`);
  }
  return content as ReleaseUpdates;
}

/** True when the update command can apply the update with no agent. */
export function isAppliedByProgram(update: BoilerplateUpdate): boolean {
  return update.appliedBy === "program";
}

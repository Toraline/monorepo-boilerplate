import { copyFileSync, existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { CommandError } from "../../shared/src/errors";
import { gitOutput, lastLine, refuseOptionValue, runGit } from "../../shared/src/git";
import { BOILERPLATE_NAME, RECORD_FILE_NAME, todayAsText, writeRecord } from "../../shared/src/record";
import { findReachableSource, SOURCE_HELP, sourcesToTry } from "../../shared/src/source";
import { parseReleaseUpdates, UPDATES_FOLDER, VERSION_FILE } from "../../shared/src/updates";
import { compareVersions, isVersion, releaseTag } from "../../shared/src/versions";
import {
  applySection,
  type CreateManifest,
  MANIFEST_VERSION,
  ManifestError,
  type ManifestValues,
  readManifest,
} from "./manifest";
import type { CreateOptions } from "./options";

export interface CreateResult {
  directory: string;
  /** The version of the boilerplate that the monorepo was created from. */
  version: string;
  source: string;
  reference: string;
  /** False when the copy has no way to remove the sample product, so it was kept. */
  sampleRemoved: boolean;
}

/** Stops when the folder exists and holds something. The command never writes into such a folder. */
export function refuseFolderInUse(directory: string): void {
  if (!existsSync(directory)) {
    const parent = dirname(directory);
    if (!existsSync(parent)) {
      throw new CommandError(
        `The folder ${parent} does not exist, so ${directory} cannot be created in it.`,
        `Create it first (mkdir -p "${parent}"), or name another folder.`,
      );
    }
    return;
  }
  if (!statSync(directory).isDirectory()) {
    throw new CommandError(`${directory} is a file, not a folder.`, "Name a folder that does not exist yet.");
  }
  if (readdirSync(directory).length > 0) {
    throw new CommandError(
      `The folder ${directory} is not empty. Nothing was changed.`,
      "Name a folder that does not exist yet, or empty this one yourself and run the command again.",
    );
  }
}

interface ChosenTemplate {
  sources: string[];
  reference: string;
}

/** The place and the tag to copy: the --ref flag, else the newest release tag of the first place that answers. */
function chooseTemplate(options: CreateOptions): ChosenTemplate {
  const candidates = sourcesToTry(options.source);
  if (options.reference !== undefined) {
    refuseOptionValue("--ref", options.reference);
    return { sources: candidates, reference: options.reference };
  }
  const reachable = findReachableSource(candidates);
  const newest = reachable.versions.at(-1);
  if (newest === undefined) {
    throw new CommandError(
      `${reachable.source} has no release tag (a tag like v0.1.0).`,
      "Name a tag or a branch yourself, for example: --ref main",
    );
  }
  return { sources: [reachable.source], reference: releaseTag(newest) };
}

/** Copies the boilerplate into the empty target folder with "git clone". Returns the place it came from. */
function copyTemplate(template: ChosenTemplate, directory: string): string {
  const existedBefore = existsSync(directory);
  const failures: string[] = [];
  for (const source of template.sources) {
    // A folder of this machine is copied whole; "--depth" is for a git address only.
    const depth = existsSync(source) ? [] : ["--depth", "1"];
    refuseOptionValue("the source", source);
    refuseOptionValue("the tag or branch", template.reference);
    // "--": what follows is the address and the folder, never an option of git.
    const result = runGit(["clone", "--quiet", ...depth, "--branch", template.reference, "--", source, directory]);
    if (result.status === 0) {
      return source;
    }
    failures.push(`${source}: ${lastLine(result.stderr) || `git ended with code ${result.status}`}`);
    // git removes what it wrote when a clone fails. This removes the rest, inside the target only.
    if (existsSync(directory)) {
      for (const entry of readdirSync(directory)) {
        rmSync(join(directory, entry), { recursive: true, force: true });
      }
      if (!existedBefore) {
        rmSync(directory, { recursive: true, force: true });
      }
    }
  }
  throw new CommandError(
    `The boilerplate could not be downloaded at "${template.reference}". ${failures.join(" | ")}`,
    `${SOURCE_HELP} If the tag or branch "${template.reference}" does not exist, name another with --ref.`,
  );
}

function readVersion(directory: string, reference: string): string {
  const versionFile = join(directory, VERSION_FILE);
  const version = existsSync(versionFile) ? readFileSync(versionFile, "utf8").trim() : "";
  if (!isVersion(version)) {
    throw new CommandError(
      `The boilerplate at "${reference}" has no file ${VERSION_FILE} with a version. It is older than the first release.`,
      "Use a release tag: run the command with no --ref, or with --ref v0.1.0 or newer.",
    );
  }
  return version;
}

/** The ids of every update of the copy's own release and of the releases before it. */
function updateIdsUpTo(directory: string, version: string): string[] {
  const folder = join(directory, UPDATES_FOLDER);
  if (!existsSync(folder)) {
    return [];
  }
  return readdirSync(folder)
    .filter((fileName) => fileName.endsWith(".json"))
    .map((fileName) => fileName.slice(0, -".json".length))
    .filter((fileVersion) => isVersion(fileVersion) && compareVersions(fileVersion, version) <= 0)
    .sort(compareVersions)
    .flatMap((fileVersion) =>
      parseReleaseUpdates(readFileSync(join(folder, `${fileVersion}.json`), "utf8"), fileVersion).updates.map(
        (update) => update.id,
      ),
    );
}

/** Applies the manifest of the copy: the sample product, the values of the project, the files of the boilerplate itself. */
export function applyManifest(
  directory: string,
  manifest: CreateManifest,
  values: ManifestValues,
  keepSample: boolean,
): void {
  if (!keepSample) {
    applySection(directory, manifest.sampleProduct, values);
  }
  applySection(directory, manifest.project, values);
  applySection(directory, manifest.boilerplateOnly, values);
}

/** Creates .env from .env.example. With a port, writes it into the line POSTGRES_PORT of .env only. */
function createEnvironmentFile(directory: string, databasePort: string | undefined): void {
  const exampleFile = join(directory, ".env.example");
  if (!existsSync(exampleFile)) {
    return;
  }
  const environmentFile = join(directory, ".env");
  copyFileSync(exampleFile, environmentFile);
  if (databasePort !== undefined) {
    const text = readFileSync(environmentFile, "utf8");
    writeFileSync(environmentFile, text.replace(/^POSTGRES_PORT=.*$/m, `POSTGRES_PORT=${databasePort}`));
  }
}

function startHistory(directory: string, version: string): void {
  const help =
    'Set your name and email in git (git config --global user.name "Your Name"; git config --global user.email "you@example.com"), ' +
    `then run in ${directory}: git add -A && git commit -m "chore: start from the boilerplate ${version}"`;
  gitOutput(["init", "--quiet", "--initial-branch", "main"], directory, help);
  gitOutput(["add", "--all"], directory, help);
  gitOutput(["commit", "--quiet", "--message", `chore: start from the boilerplate ${version}`], directory, help);
}

/**
 * Creates the new monorepo. It writes only inside `options.directory`.
 * It creates no repository on GitHub, no project in Linear and no account.
 */
export function createMonorepo(options: CreateOptions, printLine: (line: string) => void): CreateResult {
  refuseFolderInUse(options.directory);
  const template = chooseTemplate(options);
  printLine(`Downloading the boilerplate at "${template.reference}".`);
  const source = copyTemplate(template, options.directory);

  const version = readVersion(options.directory, template.reference);
  let manifest: CreateManifest;
  let appliedUpdates: string[];
  try {
    manifest = readManifest(options.directory);
    if (manifest.manifestVersion !== MANIFEST_VERSION) {
      throw new ManifestError(
        `The manifest has the format ${manifest.manifestVersion}; this command reads the format ${MANIFEST_VERSION}.`,
      );
    }
    appliedUpdates = updateIdsUpTo(options.directory, version);
    rmSync(join(options.directory, ".git"), { recursive: true, force: true });
    applyManifest(
      options.directory,
      manifest,
      {
        name: options.name,
        owner: options.owner,
        databaseName: options.databaseName,
        ticketPrefix: options.ticketPrefix,
      },
      options.keepSample,
    );
  } catch (error) {
    if (error instanceof Error) {
      throw new CommandError(
        `The boilerplate at "${template.reference}" and this command do not fit together: ${error.message} The folder ${options.directory} holds an unfinished copy.`,
        `Delete the folder ${options.directory} yourself. Then run the newest command (npx create-toraline-monorepo@latest), or name another tag with --ref.`,
      );
    }
    throw error;
  }

  writeRecord(options.directory, {
    boilerplate: BOILERPLATE_NAME,
    createdFromVersion: version,
    createdOn: todayAsText(),
    appliedUpdates,
  });
  createEnvironmentFile(options.directory, options.databasePort);
  startHistory(options.directory, version);
  printLine(`Created ${options.directory} from the boilerplate ${version}. The record is in ${RECORD_FILE_NAME}.`);
  return {
    directory: options.directory,
    version,
    source,
    reference: template.reference,
    sampleRemoved: !options.keepSample,
  };
}

/** The steps that the command does not do, for the person or the agent to do next. */
export function nextSteps(options: CreateOptions, result: CreateResult, defaultedTicketPrefix: boolean): string[] {
  const steps = [
    `Enter the folder: cd "${result.directory}"`,
    "Open Docker Desktop, then run: make setup",
    "Run the checks: make check   (the last line must be: Check passed.)",
    `Create the repository on GitHub yourself, when you want it: gh repo create ${options.owner}/${options.name} --private --source . --remote origin --push`,
    "Right after the repository is on GitHub, protect its branch main: make protect-main   (it prints the rule and asks before it creates it: pull request and check required, no force push, no deletion)",
    `In Linear: check that the team with the key ${options.ticketPrefix} exists, and create a project for this repository. The command created nothing in Linear.`,
    'Change the theme, and write 2 sentences about your project in README.md and AGENTS.md, in the place of the line "Write 2 sentences here": steps 2 and 8 of docs/start-a-new-monorepo.md.',
    'Choose the license of your project. The new folder has no file LICENSE: the license of the boilerplate is not copied. When you want one, add a file LICENSE and the line "license" to package.json.',
  ];
  if (defaultedTicketPrefix) {
    steps.push(
      `The ticket prefix is the default, ${options.ticketPrefix}. If the key of your Linear team differs, change the row ticket_prefix in AGENTS.md.`,
    );
  }
  if (options.databasePort === undefined) {
    steps.push(
      "If another PostgreSQL uses port 5432 on this machine: change the line POSTGRES_PORT in .env before make setup.",
    );
  }
  steps.push("In Claude Code or Cursor, open the folder and type: /start");
  steps.push("Later, to get the updates of the boilerplate: npx update-toraline-monorepo");
  return steps.map((step, position) => `${position + 1}. ${step}`);
}

#!/usr/bin/env node
// Prints the text of a release for the public repository, from the updates
// file of the release (boilerplate/updates/<version>.json):
//
//   node boilerplate/public/release-text.mjs <version> commit [<root folder>]
//       the message of the release commit: "release: v<version>", then the
//       title of each update.
//   node boilerplate/public/release-text.mjs <version> pull-request [<root folder>]
//       the body of the release pull request.
//
// The text holds only what the updates file holds: titles and kinds. The
// updates file is part of the public repository, so the text is public too.
// boilerplate/public/push-release.sh calls this file.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const KIND_NAMES = {
  "core-files": "Core files",
  "dependency-versions": "Dependency versions",
  security: "Security",
  "new-feature": "New feature",
  "manual-change": "Manual change",
};

const APPLIED_BY_NAMES = {
  program: "the command `update-toraline-monorepo`",
  agent: "an agent or a person, from the plan file",
};

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

const [version, form, rootFolder = "."] = process.argv.slice(2);
if (!/^\d+\.\d+\.\d+$/.test(version ?? "") || (form !== "commit" && form !== "pull-request")) {
  fail("Usage: node boilerplate/public/release-text.mjs <version> commit|pull-request [<root folder>]");
}

const updatesFile = join(rootFolder, "boilerplate", "updates", `${version}.json`);
let release;
try {
  release = JSON.parse(readFileSync(updatesFile, "utf8"));
} catch {
  fail(`${updatesFile} does not exist or is not valid JSON. A release needs its updates file.`);
}
const updates = Array.isArray(release.updates) ? release.updates : [];
if (release.version !== version || updates.length === 0) {
  fail(`${updatesFile} must hold the version ${version} and one update or more.`);
}

/** One line of text, safe inside a table cell. */
function oneLine(text) {
  return String(text).replace(/\s+/g, " ").trim().replaceAll("|", "\\|");
}

function commitMessage() {
  const titles = updates.map((update) => `- ${oneLine(update.title)} (${KIND_NAMES[update.kind] ?? update.kind})`);
  return [`release: v${version}`, "", "The updates of this release:", ...titles].join("\n");
}

function pullRequestBody() {
  const rows = updates.map(
    (update) =>
      `| ${oneLine(update.title)} | ${KIND_NAMES[update.kind] ?? update.kind} | ${APPLIED_BY_NAMES[update.appliedBy] ?? update.appliedBy} |`,
  );
  return [
    `Release \`${version}\` of the boilerplate. This pull request is one commit: every file of the release.`,
    "",
    `- Date in the updates file: ${release.date}`,
    `- Core version: ${release.coreVersion}`,
    `- Updates file: \`boilerplate/updates/${version}.json\``,
    "",
    "## The updates of this release",
    "",
    "| Update | Kind | Applied by |",
    "|---|---|---|",
    ...rows,
    "",
    "## Before you merge",
    "",
    "1. The check `check` of this pull request is green.",
    '2. Read the tab "Files changed". Everything in it becomes public.',
    "",
    "## What happens when you merge",
    "",
    `1. The workflow "Publish" creates the tag \`v${version}\` on the new commit of \`main\`.`,
    `2. It publishes \`create-toraline-monorepo@${version}\` and \`update-toraline-monorepo@${version}\` to npm.`,
    "",
    "The steps and what to do when one fails: `docs/releasing.md`.",
  ].join("\n");
}

process.stdout.write(`${form === "commit" ? commitMessage() : pullRequestBody()}\n`);

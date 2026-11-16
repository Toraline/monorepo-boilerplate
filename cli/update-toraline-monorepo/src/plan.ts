import { countOf } from "../../shared/src/text";
import { UPDATE_KINDS } from "../../shared/src/updates";
import { type PendingUpdate, referenceOf } from "./releases";

export interface AppliedUpdate {
  update: PendingUpdate;
  /** The short hash of the commit that holds the update. */
  commit: string;
}

export interface PlannedUpdate {
  update: PendingUpdate;
  /** Why the command did not apply the update itself. */
  reason: string;
}

export interface PlanContent {
  commandVersion: string;
  date: string;
  branch: string;
  /** The version that the monorepo was created from. */
  fromVersion: string;
  /** The newest release of the boilerplate. */
  toVersion: string;
  recordFile: string;
  applied: AppliedUpdate[];
  planned: PlannedUpdate[];
  notes: string[];
}

function sectionOf(planned: PlannedUpdate, previousVersion: string): string[] {
  const { update, reason } = planned;
  const reference = referenceOf(update.release);
  const lines = [
    `### ${update.id}: ${update.title}`,
    "",
    `- Status: open`,
    `- Kind: ${UPDATE_KINDS[update.kind]}`,
    `- Release: ${update.release}`,
    `- Why it is in the plan: ${reason}`,
    `- What to do: ${update.whatToDo}`,
  ];
  if (update.files.length === 0) {
    lines.push("- Files to look at: none named.");
  } else {
    lines.push("- Files to look at:");
    for (const filePath of update.files) {
      lines.push(`  - \`${filePath}\``);
    }
    lines.push(
      `- The file of the boilerplate at this release: \`git show ${reference}:<path>\``,
      `- What the boilerplate changed: \`git diff ${referenceOf(previousVersion)} ${reference} -- <path>\``,
    );
  }
  for (const change of update.dependencies ?? []) {
    const from = change.from === undefined ? "" : ` from ${change.from}`;
    lines.push(`- Dependency: \`${change.name}\` in \`${change.file}\`${from} to ${change.to}`);
  }
  lines.push("");
  return lines;
}

/** The text of the plan file: what the command applied, and what is left for the agent. */
export function planText(content: PlanContent): string {
  const lines = [
    "# Boilerplate update plan",
    "",
    `Written by \`update-toraline-monorepo\` ${content.commandVersion} on ${content.date}. The skill \`/update-boilerplate\` reads this file and does what is left.`,
    "",
    "## Context you need before reading",
    "",
    "- **Boilerplate**: the repository `Toraline/monorepo-boilerplate`, which this monorepo was created from.",
    "- **Update**: one change of the boilerplate that this monorepo can take. Each has an id.",
    `- **Record file**: \`${content.recordFile}\`. It lists the ids of the updates that this monorepo has.`,
    `- **The fetched releases**: the command fetched the release tags of the boilerplate into the git references \`refs/toraline-boilerplate/v<version>\` of this repository. git never pushes them. \`git show\` and \`git diff\` read them.`,
    "",
    "## The run",
    "",
    `- Branch: \`${content.branch}\``,
    `- The monorepo was created from version: ${content.fromVersion}`,
    `- Newest release of the boilerplate: ${content.toVersion}`,
    "",
    "## Applied by the command",
    "",
  ];
  if (content.applied.length === 0) {
    lines.push("None.");
  }
  for (const { update, commit } of content.applied) {
    lines.push(`- \`${update.id}\`: ${update.title} (commit ${commit}; already in the record file)`);
  }
  lines.push("", "## Left for the agent", "");
  if (content.planned.length === 0) {
    lines.push("None.", "");
  }
  for (const planned of content.planned) {
    lines.push(...sectionOf(planned, content.fromVersion));
  }
  if (content.notes.length > 0) {
    lines.push("## Notes", "");
    for (const note of content.notes) {
      lines.push(`- ${note}`);
    }
    lines.push("");
  }
  lines.push(
    "## Status",
    "",
    `- **Done:** when this file was written, the command had applied and committed ${countOf(content.applied.length, "update")} on the branch \`${content.branch}\`.`,
    `- **Not done:** the updates of the section "Left for the agent" whose line "Status" says open (${content.planned.length} when this file was written). Nothing was pushed. No pull request and no ticket exists.`,
    "- **What you must do:** in Claude Code or Cursor, in this folder, type `/update-boilerplate`.",
    "",
  );
  return lines.join("\n");
}

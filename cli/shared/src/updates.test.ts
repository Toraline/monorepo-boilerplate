import { describe, expect, it } from "vitest";

import { parseReleaseUpdates, problemsOfReleaseUpdates } from "./updates";

const validRelease = {
  version: "0.2.0",
  date: "2026-12-01",
  coreVersion: "0.1.9",
  updates: [
    {
      id: "0.2.0-core",
      title: "The core 0.1.9",
      kind: "core-files",
      appliedBy: "program",
      files: ["agent/rules/", "agent/CORE_VERSION"],
      whatToDo: "Copy the files from the boilerplate.",
    },
    {
      id: "0.2.0-next",
      title: "Next.js 16.4.6",
      kind: "security",
      appliedBy: "program",
      files: ["apps/web/package.json"],
      whatToDo: "Write the version into the file and install.",
      dependencies: [{ file: "apps/web/package.json", name: "next", from: "16.4.3", to: "16.4.6" }],
    },
    {
      id: "0.2.0-theme",
      title: "A new token",
      kind: "manual-change",
      appliedBy: "agent",
      files: ["packages/ui/src/theme/theme-config.ts"],
      whatToDo: "Add the token to your theme.",
    },
  ],
};

describe("an updates file", () => {
  it("is valid with the 5 values of each update", () => {
    expect(problemsOfReleaseUpdates(validRelease, "0.2.0")).toEqual([]);
    expect(parseReleaseUpdates(JSON.stringify(validRelease), "0.2.0").updates).toHaveLength(3);
  });

  it("must have the version of its file name", () => {
    expect(problemsOfReleaseUpdates(validRelease, "0.3.0")[0]).toContain('"version" must be "0.3.0"');
  });

  it("names every problem of an update", () => {
    const broken = {
      ...validRelease,
      updates: [
        { id: "core", title: "", kind: "other", appliedBy: "nobody", files: ["../outside"], whatToDo: "x" },
        validRelease.updates[0],
        validRelease.updates[0],
      ],
    };

    const problems = problemsOfReleaseUpdates(broken, "0.2.0").join("\n");

    expect(problems).toContain('"id" must start with "0.2.0-"');
    expect(problems).toContain('"title" is missing');
    expect(problems).toContain('"kind" must be one of');
    expect(problems).toContain('"appliedBy" must be "program" or "agent"');
    expect(problems).toContain("must stay inside the repository");
    expect(problems).toContain('the id "0.2.0-core" is used twice');
  });

  it("lets a program apply only core files and exact dependency versions", () => {
    const release = {
      ...validRelease,
      updates: [{ ...validRelease.updates[2], appliedBy: "program" }],
    };

    expect(problemsOfReleaseUpdates(release, "0.2.0").join("\n")).toContain("a program can apply only");
    expect(() => parseReleaseUpdates(JSON.stringify(release), "0.2.0")).toThrow("is not valid");
  });
});

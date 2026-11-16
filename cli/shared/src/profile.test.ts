import { describe, expect, it } from "vitest";

import { profileValue } from "./profile";

const agentsFile = [
  "| Key | Value | Meaning |",
  "|---|---|---|",
  "| `base_branch` | `main` | Branch that pull requests target |",
  "| `review_rules` | `<ask>` | Not set yet |",
].join("\n");

describe("profileValue", () => {
  it("reads a value of the profile table", () => {
    expect(profileValue(agentsFile, "base_branch")).toBe("main");
  });

  it("is empty for a missing key and for a value that is not set yet", () => {
    expect(profileValue(agentsFile, "push")).toBe("");
    expect(profileValue(agentsFile, "review_rules")).toBe("");
  });
});

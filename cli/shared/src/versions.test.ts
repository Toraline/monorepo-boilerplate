import { describe, expect, it } from "vitest";

import { compareVersions, isVersion, releaseTag, sortVersions, versionOfTag } from "./versions";

describe("versions", () => {
  it("accepts three numbers only", () => {
    expect(isVersion("0.1.0")).toBe(true);
    expect(isVersion("0.1")).toBe(false);
    expect(isVersion("v0.1.0")).toBe(false);
    expect(isVersion("0.1.0-beta.1")).toBe(false);
  });

  it("compares by numbers, not by letters", () => {
    expect(compareVersions("0.10.0", "0.9.0")).toBeGreaterThan(0);
    expect(compareVersions("1.0.0", "0.99.99")).toBeGreaterThan(0);
    expect(compareVersions("0.1.0", "0.1.0")).toBe(0);
    expect(sortVersions(["0.10.0", "0.2.0", "0.1.5"])).toEqual(["0.1.5", "0.2.0", "0.10.0"]);
  });

  it("reads the version of a release tag, and of no other tag", () => {
    expect(releaseTag("0.1.0")).toBe("v0.1.0");
    expect(versionOfTag("v0.1.0")).toBe("0.1.0");
    expect(versionOfTag("0.1.0")).toBeNull();
    expect(versionOfTag("v0.1.0-beta.1")).toBeNull();
    expect(versionOfTag("old-package")).toBeNull();
  });
});

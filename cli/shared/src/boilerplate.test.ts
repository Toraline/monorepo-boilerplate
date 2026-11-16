// Checks of the boilerplate itself: its version, its updates files and the two
// packages must agree. A release with a wrong number fails here, in "make check".
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { BOILERPLATE_ROOT } from "./testing";
import { parseReleaseUpdates, UPDATES_FOLDER, VERSION_FILE } from "./updates";
import { isVersion, sortVersions } from "./versions";

const version = readFileSync(join(BOILERPLATE_ROOT, VERSION_FILE), "utf8").trim();
const releaseVersions = sortVersions(
  readdirSync(join(BOILERPLATE_ROOT, UPDATES_FOLDER)).map((fileName) => fileName.replace(/\.json$/, "")),
);
const releases = releaseVersions.map((releaseVersion) =>
  parseReleaseUpdates(
    readFileSync(join(BOILERPLATE_ROOT, UPDATES_FOLDER, `${releaseVersion}.json`), "utf8"),
    releaseVersion,
  ),
);

describe("the version of the boilerplate", () => {
  it("is three numbers, in boilerplate/VERSION", () => {
    expect(isVersion(version)).toBe(true);
  });

  it("is the version of the newest updates file", () => {
    expect(releaseVersions.at(-1)).toBe(version);
  });

  it("has one valid updates file per release, and no update id twice", () => {
    const updateIds = releases.flatMap((release) => release.updates.map((update) => update.id));

    expect(new Set(updateIds).size).toBe(updateIds.length);
  });

  it("names the core version of agent/CORE_VERSION in the newest updates file", () => {
    const coreVersion = readFileSync(join(BOILERPLATE_ROOT, "agent", "CORE_VERSION"), "utf8").trim();

    expect(releases.at(-1)?.coreVersion).toBe(coreVersion);
  });

  it("is the version of each of the two packages", () => {
    for (const packageName of ["create-toraline-monorepo", "update-toraline-monorepo"]) {
      const packageFile = join(BOILERPLATE_ROOT, "cli", packageName, "package.json");
      // A package that is not built yet has no folder.
      if (existsSync(packageFile)) {
        expect(JSON.parse(readFileSync(packageFile, "utf8")).version, packageName).toBe(version);
      }
    }
  });
});

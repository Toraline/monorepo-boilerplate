import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { runGit } from "./git";
import { DEFAULT_SOURCES, findReachableSource, SOURCE_ENVIRONMENT_VARIABLE, sourcesToTry } from "./source";
import { commitAll, newRepository, temporaryFolder, writeFiles } from "./testing";

describe("sourcesToTry", () => {
  it("gives the two GitHub addresses when nothing names another place", () => {
    expect(sourcesToTry(undefined, {})).toEqual(DEFAULT_SOURCES);
  });

  it("gives a folder of this machine as a full path", () => {
    const folder = temporaryFolder("source");

    expect(sourcesToTry(folder, {})).toEqual([folder]);
  });

  it("refuses a flag value that starts with -", () => {
    expect(() => sourcesToTry("--upload-pack=touch /tmp/file", {})).toThrow(
      'The value of --source starts with "-"',
    );
    expect(() => sourcesToTry("-u", {})).toThrow('The value of --source starts with "-"');
  });

  it("refuses a value of the environment variable that starts with -", () => {
    expect(() => sourcesToTry(undefined, { [SOURCE_ENVIRONMENT_VARIABLE]: "--upload-pack=touch /tmp/file" })).toThrow(
      `The value of ${SOURCE_ENVIRONMENT_VARIABLE} starts with "-"`,
    );
  });
});

describe("findReachableSource", () => {
  it("reads the release tags of a folder of this machine", () => {
    const source = newRepository("source");
    writeFiles(source, { "file.txt": "one" });
    commitAll(source, "release 0.1.0", "0.1.0");

    expect(findReachableSource([source])).toEqual({ source, versions: ["0.1.0"] });
  });

  it("refuses a place that starts with -, and runs no program", () => {
    const marker = join(temporaryFolder("marker"), "program-ran");

    expect(() => findReachableSource([`--upload-pack=touch ${marker}`])).toThrow('starts with "-"');
    expect(existsSync(marker)).toBe(false);
  });
});

describe("git and a value that starts with -", () => {
  // This is what the refusal protects against: without "--", git reads the
  // value as its option "--upload-pack" and runs the program that it names.
  it("runs the program of --upload-pack when the value is given with no check", () => {
    const repository = newRepository("victim");
    const marker = join(temporaryFolder("marker"), "program-ran");

    runGit(["ls-remote", `--upload-pack=touch ${marker}`, repository]);

    expect(existsSync(marker)).toBe(true);
  });

  it("runs no program when the value comes after --", () => {
    const marker = join(temporaryFolder("marker"), "program-ran");

    const result = runGit(["ls-remote", "--tags", "--refs", "--", `--upload-pack=touch ${marker}`]);

    expect(result.status).not.toBe(0);
    expect(existsSync(marker)).toBe(false);
  });
});

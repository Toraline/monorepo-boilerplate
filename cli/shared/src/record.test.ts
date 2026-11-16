import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { CommandError } from "./errors";
import { readRecord, RECORD_FILE_NAME, todayAsText, writeRecord } from "./record";
import { temporaryFolder } from "./testing";

describe("the record file", () => {
  it("is written as JSON with the 4 values, and read back the same", () => {
    const folder = temporaryFolder("record");
    const record = {
      boilerplate: "Toraline/monorepo-boilerplate",
      createdFromVersion: "0.1.0",
      createdOn: "2026-11-15",
      appliedUpdates: ["0.1.0-first-release"],
    };

    writeRecord(folder, record);

    expect(JSON.parse(readFileSync(join(folder, RECORD_FILE_NAME), "utf8"))).toEqual(record);
    expect(readRecord(folder)).toEqual(record);
  });

  it("is null in a folder with no record file", () => {
    expect(readRecord(temporaryFolder("record"))).toBeNull();
  });

  it("is refused, with what to do, when the version or the list is wrong", () => {
    const folder = temporaryFolder("record");
    for (const content of ["not json", '{"createdFromVersion":"one","appliedUpdates":[]}', '{"createdFromVersion":"0.1.0"}']) {
      writeFileSync(join(folder, RECORD_FILE_NAME), content);

      expect(() => readRecord(folder)).toThrow(CommandError);
    }
  });

  it("writes a day as YYYY-MM-DD", () => {
    expect(todayAsText(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

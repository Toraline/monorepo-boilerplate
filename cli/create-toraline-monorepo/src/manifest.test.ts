import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { temporaryFolder, writeFiles } from "../../shared/src/testing";
import { applySection, ManifestError, type ManifestValues } from "./manifest";

const values: ManifestValues = {
  name: "shop",
  owner: "sample-owner",
  databaseName: "shop_db",
  ticketPrefix: "SHP",
};

function folderWith(files: Record<string, string>): string {
  const folder = temporaryFolder("manifest");
  writeFiles(folder, files);
  return folder;
}

describe("applySection", () => {
  it("replaces a text with the values of the project", () => {
    const folder = folderWith({ "package.json": '{\n  "name": "monorepo-boilerplate",\n}\n' });

    applySection(
      folder,
      { replace: [{ file: "package.json", find: '"name": "monorepo-boilerplate"', replace: '"name": "{{name}}"', count: 1 }] },
      values,
    );

    expect(readFileSync(join(folder, "package.json"), "utf8")).toBe('{\n  "name": "shop",\n}\n');
  });

  it("stops when a file does not hold the text the expected number of times", () => {
    const folder = folderWith({ "README.md": "todo todo\n" });

    expect(() =>
      applySection(folder, { replace: [{ file: "README.md", find: "todo", replace: "x", count: 1 }] }, values),
    ).toThrow(new ManifestError('README.md holds the text "todo" 2 times; the manifest expects 1.'));
    expect(readFileSync(join(folder, "README.md"), "utf8")).toBe("todo todo\n");
  });

  it("removes and sets keys of a JSON file, and keeps the other keys in their order", () => {
    const folder = folderWith({
      "en.json": `${JSON.stringify({ metadata: { title: "Todo list" }, menu: { label: "Areas", tags: "Tags" }, todos: { title: "Your todos" } }, null, 2)}\n`,
    });

    applySection(
      folder,
      {
        json: [
          {
            file: "en.json",
            remove: ["todos", "menu.tags"],
            set: { "metadata.title": "{{name}} admin", "menu.home": "Start", home: { title: "Start page" } },
          },
        ],
      },
      values,
    );

    expect(readFileSync(join(folder, "en.json"), "utf8")).toBe(
      `${JSON.stringify({ metadata: { title: "shop admin" }, menu: { label: "Areas", home: "Start" }, home: { title: "Start page" } }, null, 2)}\n`,
    );
  });

  it("stops when a key to remove does not exist", () => {
    const folder = folderWith({ "en.json": "{}\n" });

    expect(() => applySection(folder, { json: [{ file: "en.json", remove: ["todos"] }] }, values)).toThrow(
      'en.json has no key "todos" to remove.',
    );
  });

  it("deletes files and folders, and replaces a file with its overlay", () => {
    const folder = folderWith({
      "apps/todos/models.py": "x",
      "page.tsx": "the todo list",
      "overlays/page.tsx": "the start page",
    });

    applySection(
      folder,
      { overlays: [{ file: "page.tsx", from: "overlays/page.tsx", originalSha256: "" }], delete: ["apps/todos", "overlays"] },
      values,
    );

    expect(existsSync(join(folder, "apps/todos"))).toBe(false);
    expect(existsSync(join(folder, "overlays"))).toBe(false);
    expect(readFileSync(join(folder, "page.tsx"), "utf8")).toBe("the start page");
  });

  it("never deletes or writes outside the folder", () => {
    const outside = folderWith({ "keep.txt": "keep" });
    const folder = join(outside, "inside");
    writeFiles(folder, { "file.txt": "x" });

    expect(() => applySection(folder, { delete: ["../keep.txt"] }, values)).toThrow("is not inside");
    expect(() => applySection(folder, { delete: ["."] }, values)).toThrow("is not inside");
    expect(() =>
      applySection(folder, { replace: [{ file: "../keep.txt", find: "keep", replace: "x", count: 1 }] }, values),
    ).toThrow("is not inside");
    expect(readFileSync(join(outside, "keep.txt"), "utf8")).toBe("keep");
  });
});

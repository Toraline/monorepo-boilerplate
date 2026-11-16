import { describe, expect, it } from "vitest";

import { loginPathFor, safeNextPath } from "./next-path";

describe("safeNextPath", () => {
  it("keeps a path inside the app, with its filters", () => {
    expect(safeNextPath("/todos?owner=4&page=2")).toBe("/todos?owner=4&page=2");
  });

  it.each([
    ["no value", undefined],
    ["a list of values", ["/a", "/b"]],
    ["an empty text", ""],
    ["the address of another site", "https://example.com/"],
    ["an address that starts with two slashes", "//example.com"],
    ["an address with a backslash", "/\\example.com"],
    ["a path without a slash", "todos"],
    ["the login page itself", "/login"],
    ["the login page with a value", "/login?next=/todos"],
  ])("gives the start page for %s", (_name, value) => {
    expect(safeNextPath(value)).toBe("/");
  });
});

describe("loginPathFor", () => {
  it("names the page to return to", () => {
    expect(loginPathFor("/todos?owner=4")).toBe(
      "/login?next=%2Ftodos%3Fowner%3D4",
    );
  });

  it("has no next value for the start page", () => {
    expect(loginPathFor("/")).toBe("/login");
  });
});

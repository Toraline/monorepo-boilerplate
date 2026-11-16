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
    ["a tab after the first slash", "/\t/example.com"],
    ["a line break after the first slash", "/\n/example.com"],
    ["a carriage return after the first slash", "/\r/example.com"],
    ["a carriage return and a line break", "/\r\n/example.com"],
    ["a tab before the first slash", "\t//example.com"],
    ["a tab inside the path", "/todos\t"],
    ["a null character", "/\u0000/example.com"],
    ["the character with the code 127", "/\u007f/example.com"],
    ["a backslash after the first slash", "/\\/example.com"],
    ["two backslashes", "\\\\example.com"],
    ["a backslash later in the path", "/todos\\..\\example.com"],
    ["an address without its protocol", "//example.com/todos"],
    ["three slashes", "///example.com"],
    ["an http address", "http://example.com/todos"],
    ["an address with a user name", "https://name@example.com/"],
    ["a javascript address", "javascript:alert(1)"],
    ["a data address", "data:text/html,<p>text</p>"],
    ["a space before the address", " https://example.com/"],
    ["an encoded tab that is still encoded", "/%09/example.com"],
    ["an encoded line break that is still encoded", "/%0A/example.com"],
    ["an encoded carriage return that is still encoded", "/%0d/example.com"],
    ["an encoded backslash that is still encoded", "/%5Cexample.com"],
    ["an encoded second slash that is still encoded", "/%2Fexample.com"],
    ["a broken code", "/todos%"],
  ])("gives the start page for %s", (_name, value) => {
    expect(safeNextPath(value)).toBe("/");
  });

  it.each([
    ["an encoded space", "/todos?title=milk%20and%20bread"],
    ["an encoded slash in a filter", "/todos?title=a%2Fb"],
    ["a letter with an accent", "/todos?title=p\u00e3o"],
    ["a part after #", "/todos#first"],
  ])("keeps a path inside the app with %s", (_name, value) => {
    expect(safeNextPath(value)).toBe(value);
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

  it("has no next value for a path that a browser reads as another site", () => {
    expect(loginPathFor("/\t/example.com")).toBe("/login");
  });
});

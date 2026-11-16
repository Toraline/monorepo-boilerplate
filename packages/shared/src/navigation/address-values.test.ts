import { describe, expect, it } from "vitest";

import { readChoice, readId, readPage } from "./address-values";

describe("readPage", () => {
  it("reads a page number", () => {
    expect(readPage("3")).toBe(3);
  });

  it.each([null, "", "0", "-1", "1.5", "two"])("gives page 1 for %s", (value) => {
    expect(readPage(value)).toBe(1);
  });
});

describe("readId", () => {
  it("reads an id", () => {
    expect(readId("4")).toBe(4);
  });

  it.each([null, "", "0", "abc"])("gives null for %s", (value) => {
    expect(readId(value)).toBeNull();
  });
});

describe("readChoice", () => {
  it("reads an allowed word", () => {
    expect(readChoice("true", ["true", "false"])).toBe("true");
  });

  it("gives null for another word and for no value", () => {
    expect(readChoice("maybe", ["true", "false"])).toBeNull();
    expect(readChoice(null, ["true", "false"])).toBeNull();
  });
});

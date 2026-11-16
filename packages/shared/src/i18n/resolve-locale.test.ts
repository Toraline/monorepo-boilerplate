import { describe, expect, it } from "vitest";

import {
  matchAcceptLanguage,
  parseAcceptLanguage,
  resolveLocale,
} from "./resolve-locale";

describe("parseAcceptLanguage", () => {
  it("orders the tags by their q value, most wanted first", () => {
    expect(parseAcceptLanguage("en;q=0.8,pt-BR,pt;q=0.9")).toEqual([
      "pt-BR",
      "pt",
      "en",
    ]);
  });

  it("keeps the order of the header for tags with the same q value", () => {
    expect(parseAcceptLanguage("fr, en, pt-BR")).toEqual(["fr", "en", "pt-BR"]);
  });

  it("leaves out a tag with q=0, the tag * and empty parts", () => {
    expect(parseAcceptLanguage("en;q=0, *;q=0.5, , pt-BR;q=0.3")).toEqual([
      "pt-BR",
    ]);
  });
});

describe("matchAcceptLanguage", () => {
  it.each([
    ["pt-BR", "pt-BR"],
    ["pt-br", "pt-BR"],
    ["pt", "pt-BR"],
    ["pt-PT", "pt-BR"],
    ["en", "en"],
    ["en-US", "en"],
    ["en-GB,en;q=0.9", "en"],
    ["pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7", "pt-BR"],
    ["en-US,en;q=0.9,pt-BR;q=0.8", "en"],
    ["fr-FR,fr;q=0.9,pt;q=0.5,en;q=0.4", "pt-BR"],
    ["fr;q=0.9,en;q=0.2,pt-BR;q=0.1", "en"],
  ])("%s gives %s", (header, expected) => {
    expect(matchAcceptLanguage(header)).toBe(expected);
  });

  it.each([["fr-FR,fr;q=0.9"], ["de"], ["*"], [""], [null], [undefined]])(
    "%s gives no language",
    (header) => {
      expect(matchAcceptLanguage(header)).toBeUndefined();
    },
  );
});

describe("resolveLocale", () => {
  it("uses the language of the cookie before the language of the browser", () => {
    expect(
      resolveLocale({ cookieValue: "en", acceptLanguage: "pt-BR" }),
    ).toBe("en");
    expect(
      resolveLocale({ cookieValue: "pt-BR", acceptLanguage: "en-US" }),
    ).toBe("pt-BR");
  });

  it("uses the language of the browser on a first visit", () => {
    expect(resolveLocale({ acceptLanguage: "pt-BR,pt;q=0.9" })).toBe("pt-BR");
    expect(resolveLocale({ cookieValue: null, acceptLanguage: "en-US" })).toBe(
      "en",
    );
  });

  it("uses English when the browser asks for another language", () => {
    expect(resolveLocale({ acceptLanguage: "fr-FR,fr;q=0.9" })).toBe("en");
  });

  it("uses English when there is no cookie and no header", () => {
    expect(resolveLocale({})).toBe("en");
  });

  it("ignores a cookie with a language that the apps do not have", () => {
    expect(resolveLocale({ cookieValue: "fr", acceptLanguage: "pt" })).toBe(
      "pt-BR",
    );
    expect(resolveLocale({ cookieValue: "../secret" })).toBe("en");
  });
});

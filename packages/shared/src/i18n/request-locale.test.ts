import { beforeEach, describe, expect, it, vi } from "vitest";

const request = {
  cookie: undefined as string | undefined,
  acceptLanguage: null as string | null,
};

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "NEXT_LOCALE" && request.cookie !== undefined
        ? { name, value: request.cookie }
        : undefined,
  }),
  headers: async () => ({
    get: (name: string) =>
      name === "accept-language" ? request.acceptLanguage : null,
  }),
}));

import { getRequestLocale } from "./request-locale";

beforeEach(() => {
  request.cookie = undefined;
  request.acceptLanguage = null;
});

describe("getRequestLocale", () => {
  it("uses the language of the browser on a first visit", async () => {
    request.acceptLanguage = "pt-BR,pt;q=0.9,en;q=0.8";

    await expect(getRequestLocale()).resolves.toBe("pt-BR");
  });

  it("uses the cookie before the language of the browser", async () => {
    request.cookie = "en";
    request.acceptLanguage = "pt-BR";

    await expect(getRequestLocale()).resolves.toBe("en");
  });

  it("uses English with no cookie and no header", async () => {
    await expect(getRequestLocale()).resolves.toBe("en");
  });
});

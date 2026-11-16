import { beforeEach, describe, expect, it, vi } from "vitest";

const cookieStore = { get: vi.fn() };

vi.mock("next/headers", () => ({
  cookies: async () => cookieStore,
}));

import { getRequestTheme } from "./request-theme";

beforeEach(() => {
  cookieStore.get.mockReset();
});

describe("getRequestTheme", () => {
  it("reads the cookie toraline-theme and returns its theme", async () => {
    cookieStore.get.mockReturnValue({ name: "toraline-theme", value: "dark" });

    expect(await getRequestTheme()).toBe("dark");
    expect(cookieStore.get).toHaveBeenCalledWith("toraline-theme");
  });

  it("returns the default theme, light, when the request has no theme cookie", async () => {
    cookieStore.get.mockReturnValue(undefined);

    expect(await getRequestTheme()).toBe("light");
  });

  it("returns the default theme, light, when the cookie has a value that is not a theme", async () => {
    cookieStore.get.mockReturnValue({ name: "toraline-theme", value: "blue" });

    expect(await getRequestTheme()).toBe("light");
  });
});

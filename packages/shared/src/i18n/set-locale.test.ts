import { beforeEach, describe, expect, it, vi } from "vitest";

const cookieStore = { set: vi.fn() };

vi.mock("next/headers", () => ({
  cookies: async () => cookieStore,
}));

import { setLocale } from "./set-locale";

function formWith(locale: string | null): FormData {
  const formData = new FormData();
  if (locale !== null) {
    formData.set("locale", locale);
  }
  return formData;
}

beforeEach(() => {
  cookieStore.set.mockClear();
});

describe("setLocale", () => {
  it.each(["en", "pt-BR"])("keeps %s in the cookie for 1 year", async (locale) => {
    await setLocale(formWith(locale));

    expect(cookieStore.set).toHaveBeenCalledTimes(1);
    expect(cookieStore.set).toHaveBeenCalledWith("NEXT_LOCALE", locale, {
      path: "/",
      maxAge: 31536000,
      sameSite: "lax",
    });
  });

  it.each(["fr", "", "EN", null])(
    "changes nothing for the value %s",
    async (locale) => {
      await setLocale(formWith(locale));

      expect(cookieStore.set).not.toHaveBeenCalled();
    },
  );
});

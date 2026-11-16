import {
  readThemeCookie,
  serializeThemeCookie,
  type ThemeInput,
} from "@toraline.tech/tokens";
import { describe, expect, it } from "vitest";

import {
  THEME_COOKIE_NAME,
  defaultTheme,
  isThemeName,
  nextTheme,
  resolveProjectTheme,
  themeInputs,
  themes,
} from "./index";

/** The relative luminance of a color written as #rrggbb, by the WCAG 2 formula. */
function luminance(hexColor: string): number {
  const channels = [1, 3, 5].map((start) => {
    const value = Number.parseInt(hexColor.slice(start, start + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/** The WCAG 2 contrast of two colors: 1 (the same color) to 21 (black on white). */
function contrast(firstColor: string, secondColor: string): number {
  const lighter = Math.max(luminance(firstColor), luminance(secondColor));
  const darker = Math.min(luminance(firstColor), luminance(secondColor));
  return (lighter + 0.05) / (darker + 0.05);
}

/** The value that a theme input gives one color token. Empty when it gives none. */
function colorOf(themeInput: ThemeInput, tokenName: string): string {
  return themeInput.colors?.[tokenName] ?? "";
}

// The page and surface backgrounds of the library themes, which this project keeps.
const libraryBackgrounds: Record<string, string[]> = {
  light: ["#f1f3f6", "#ffffff"],
  dark: ["#0c111d", "#161b26"],
};

describe("the themes of the project", () => {
  it("has one theme input per theme name, in the same order", () => {
    expect(themeInputs.map((themeInput) => themeInput.name)).toEqual([
      ...themes,
    ]);
  });

  it("has light as the default theme, and only light is marked as default", () => {
    expect(defaultTheme).toBe("light");
    expect(
      themeInputs
        .filter((themeInput) => themeInput.isDefault)
        .map((themeInput) => themeInput.name),
    ).toEqual(["light"]);
  });

  it("has a main color that is not the main color of the library", () => {
    const mainColors = themeInputs.map((themeInput) =>
      colorOf(themeInput, "bg-primary"),
    );

    expect(mainColors).toEqual(["#6d28d9", "#c4b5fd"]);
    expect(mainColors).not.toContain("#42637c");
    expect(mainColors).not.toContain("#8eaec5");
  });

  it.each(themeInputs)(
    "has a readable text on the main color in the theme $name (contrast 4.5 or more)",
    (themeInput) => {
      const textOnMainColor = colorOf(themeInput, "text-inverse");

      expect(
        contrast(textOnMainColor, colorOf(themeInput, "bg-primary")),
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrast(textOnMainColor, colorOf(themeInput, "bg-primary-hover")),
      ).toBeGreaterThanOrEqual(4.5);
    },
  );

  it.each(themeInputs)(
    "has a readable brand text on the page and on a surface in the theme $name",
    (themeInput) => {
      const brandText = colorOf(themeInput, "text-brand");

      for (const background of libraryBackgrounds[themeInput.name]) {
        expect(contrast(brandText, background)).toBeGreaterThanOrEqual(4.5);
      }
    },
  );
});

describe("isThemeName", () => {
  it("accepts the two theme names and nothing else", () => {
    expect(isThemeName("light")).toBe(true);
    expect(isThemeName("dark")).toBe(true);
    expect(isThemeName("Dark")).toBe(false);
    expect(isThemeName("")).toBe(false);
    expect(isThemeName(undefined)).toBe(false);
  });
});

describe("nextTheme", () => {
  it("goes from light to dark and from dark back to light", () => {
    expect(nextTheme("light")).toBe("dark");
    expect(nextTheme("dark")).toBe("light");
  });
});

describe("the theme cookie", () => {
  it("has the name that the library reads and writes", () => {
    expect(THEME_COOKIE_NAME).toBe("toraline-theme");
  });

  it("is found in a Cookie header next to other cookies", () => {
    const cookieHeader = `NEXT_LOCALE=pt-BR; ${THEME_COOKIE_NAME}=dark; other=1`;

    expect(resolveProjectTheme(readThemeCookie(cookieHeader))).toBe("dark");
  });

  it("gives the default theme when the Cookie header has no theme cookie", () => {
    expect(resolveProjectTheme(readThemeCookie("NEXT_LOCALE=pt-BR"))).toBe(
      "light",
    );
    expect(resolveProjectTheme(readThemeCookie(""))).toBe("light");
  });

  it("is saved for 1 year, for every page, and read back as the same theme", () => {
    const savedCookie = serializeThemeCookie("dark");

    expect(savedCookie).toBe(
      "toraline-theme=dark; Path=/; Max-Age=31536000; SameSite=Lax",
    );
    expect(resolveProjectTheme(readThemeCookie(savedCookie))).toBe("dark");
  });
});

import { fireEvent, screen } from "@testing-library/react";
import { ThemeProvider } from "@toraline.tech/ui/theme";
import { afterEach, describe, expect, it } from "vitest";

import type { Locale } from "@repo/shared/i18n";
import { themes, type ThemeName } from "@repo/ui/theme";

import { renderWithMessages } from "@/test/render";

import { ThemeSwitch } from "./theme-switch";

function renderThemeSwitch(initialTheme: ThemeName, locale: Locale = "en") {
  return renderWithMessages(
    <ThemeProvider themes={themes} initialTheme={initialTheme}>
      <ThemeSwitch />
    </ThemeProvider>,
    locale,
  );
}

afterEach(() => {
  document.documentElement.removeAttribute("data-theme");
  document.cookie = "toraline-theme=; Path=/; Max-Age=0";
});

describe("ThemeSwitch", () => {
  it("shows the current theme in English, with an accessible name that says what a press does", () => {
    renderThemeSwitch("light");

    expect(
      screen.getByRole("button", { name: "Theme: light. Switch to dark." }),
    ).toHaveTextContent("Theme: light");
  });

  it("shows the current theme in Portuguese on a Portuguese page", () => {
    renderThemeSwitch("dark", "pt-BR");

    expect(
      screen.getByRole("button", { name: "Tema: escuro. Mudar para claro." }),
    ).toHaveTextContent("Tema: escuro");
  });

  it("changes the theme of the page on a press and keeps the choice in the cookie", () => {
    renderThemeSwitch("light");

    fireEvent.click(screen.getByRole("button"));

    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(document.cookie).toContain("toraline-theme=dark");
    expect(
      screen.getByRole("button", { name: "Theme: dark. Switch to light." }),
    ).toHaveTextContent("Theme: dark");
  });
});

import { fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider } from "@toraline.tech/ui/theme";
import { afterEach, describe, expect, it } from "vitest";

import { themes, type ThemeName } from "../theme";
import { ThemeToggle } from "./theme-toggle";

const labels = { light: "Theme: light", dark: "Theme: dark" };
const accessibleNames = {
  light: "Theme: light. Switch to dark.",
  dark: "Theme: dark. Switch to light.",
};

function renderToggle(initialTheme: ThemeName) {
  return render(
    <ThemeProvider themes={themes} initialTheme={initialTheme}>
      <ThemeToggle labels={labels} accessibleNames={accessibleNames} />
    </ThemeProvider>,
  );
}

function deleteThemeCookie() {
  document.cookie = "toraline-theme=; Path=/; Max-Age=0";
}

afterEach(() => {
  document.documentElement.removeAttribute("data-theme");
  deleteThemeCookie();
});

describe("ThemeToggle", () => {
  it("shows the text of the current theme, and has the accessible name of that theme", () => {
    renderToggle("light");

    const button = screen.getByRole("button", {
      name: "Theme: light. Switch to dark.",
    });
    expect(button).toHaveTextContent("Theme: light");
    expect(button).toHaveAttribute("type", "button");
  });

  it("starts in the theme that the server read from the cookie", () => {
    renderToggle("dark");

    expect(
      screen.getByRole("button", { name: "Theme: dark. Switch to light." }),
    ).toHaveTextContent("Theme: dark");
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
  });

  it("changes the page to the dark theme on a press, and saves the choice in the cookie", () => {
    renderToggle("light");

    fireEvent.click(screen.getByRole("button"));

    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(document.cookie).toContain("toraline-theme=dark");
    expect(
      screen.getByRole("button", { name: "Theme: dark. Switch to light." }),
    ).toHaveTextContent("Theme: dark");
  });

  it("goes back to the light theme on a second press", () => {
    renderToggle("light");

    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByRole("button"));

    expect(document.documentElement).toHaveAttribute("data-theme", "light");
    expect(document.cookie).toContain("toraline-theme=light");
    expect(screen.getByRole("button")).toHaveTextContent("Theme: light");
  });

  it("fails with a clear error outside the ThemeProvider", () => {
    expect(() =>
      render(<ThemeToggle labels={labels} accessibleNames={accessibleNames} />),
    ).toThrow("useTheme must be used inside <ThemeProvider>.");
  });
});

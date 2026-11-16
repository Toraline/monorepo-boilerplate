"use client";

import { Button } from "@toraline.tech/ui";
import { useTheme } from "@toraline.tech/ui/theme";

import { defaultTheme, isThemeName, nextTheme, type ThemeName } from "../theme";

export type ThemeToggleProps = {
  /**
   * The text the button shows, for each theme the page can have now.
   * Example: { light: "Theme: light", dark: "Theme: dark" }.
   */
  labels: Record<ThemeName, string>;
  /**
   * The name a screen reader says for the button, for each theme the page can
   * have now. Example: { light: "Theme: light. Switch to dark.", ... }.
   * Start it with the text of `labels`: a person who controls the device with
   * the voice says the text they see.
   */
  accessibleNames: Record<ThemeName, string>;
};

/**
 * A button that changes the theme of the page. Each press shows the next theme
 * and saves the choice in the theme cookie. It works only inside the
 * `ThemeProvider` of `@toraline.tech/ui/theme`, which the root layout of each
 * app has. This package holds no text: the app gives the texts, translated.
 */
export function ThemeToggle({ labels, accessibleNames }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const currentTheme = isThemeName(theme) ? theme : defaultTheme;

  return (
    <Button
      variant="secondary"
      size="sm"
      data-theme-toggle={currentTheme}
      aria-label={accessibleNames[currentTheme]}
      onClick={() => setTheme(nextTheme(currentTheme))}
    >
      {labels[currentTheme]}
    </Button>
  );
}

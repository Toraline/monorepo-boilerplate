import type { ThemeInput } from "@toraline.tech/tokens";

/**
 * The theme of this project: the values that differ from the default look of
 * the library `@toraline.tech/ui`. The main color of the project is violet;
 * the main color of the library is blue-grey.
 *
 * A key of `colors` is the name of a color token of the library without the
 * two dashes: `bg-primary` changes the CSS variable `--bg-primary`. A token
 * that is not here keeps the value of the library theme named in `base`.
 *
 * After a change in this file, write the CSS file again: `npm run theme
 * --workspace packages/ui`. A test fails while the CSS file is outdated.
 * The steps are in docs/theme.md.
 */
export const themeInputs: ThemeInput[] = [
  {
    name: "light",
    base: "light",
    isDefault: true,
    colors: {
      // The main action: the background of a primary Button, and its text.
      "bg-primary": "#6d28d9",
      "bg-primary-hover": "#5b21b6",
      "text-inverse": "#ffffff",
      // Pale backgrounds in the main color, for example a selected row.
      "bg-primary-subtle": "#f5f3ff",
      "bg-primary-muted": "#ede9fe",
      "bg-selected": "#f5f3ff",
      // Text, borders and icons in the main color.
      "text-brand": "#6d28d9",
      "border-brand": "#6d28d9",
      "border-focus": "#7c3aed",
      "icon-brand": "#6d28d9",
    },
  },
  {
    name: "dark",
    base: "dark",
    colors: {
      "bg-primary": "#c4b5fd",
      "bg-primary-hover": "#ddd6fe",
      "text-inverse": "#0c111d",
      "bg-primary-subtle": "#211a3a",
      "bg-primary-muted": "#2e2553",
      "bg-selected": "#211a3a",
      "text-brand": "#c4b5fd",
      "border-brand": "#c4b5fd",
      "border-focus": "#c4b5fd",
      "icon-brand": "#c4b5fd",
    },
  },
];

/** The theme names, in the order the theme toggle goes through them. */
export const themes = ["light", "dark"] as const;

export type ThemeName = (typeof themes)[number];

/** The theme of a person who has not chosen one. */
export const defaultTheme: ThemeName = "light";

export function isThemeName(value: unknown): value is ThemeName {
  return typeof value === "string" && themes.includes(value as ThemeName);
}

/** The theme that one press of the theme toggle shows. After the last theme comes the first. */
export function nextTheme(theme: ThemeName): ThemeName {
  return themes[(themes.indexOf(theme) + 1) % themes.length];
}

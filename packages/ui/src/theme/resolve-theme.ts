import { resolveTheme } from "@toraline.tech/tokens";

import { defaultTheme, themes, type ThemeName } from "./theme-config";

/**
 * Decides which theme a request gets, from the value of the theme cookie.
 * The value of the cookie when it is the name of a theme of this project.
 * Otherwise the default theme: no cookie, an empty value, a name that is not a
 * theme, a name in another case ("DARK").
 */
export function resolveProjectTheme(
  cookieValue: string | null | undefined,
): ThemeName {
  return resolveTheme(cookieValue, themes, defaultTheme) as ThemeName;
}

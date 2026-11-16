import { cookies } from "next/headers";

import { THEME_COOKIE_NAME } from "@toraline.tech/tokens";

import { resolveProjectTheme } from "./resolve-theme";
import type { ThemeName } from "./theme-config";

/**
 * The theme of the request that the Next.js server is answering now.
 * Only for code that runs on the server: it reads the theme cookie. The root
 * layout of each app writes the result on `<html data-theme>`, so the page
 * arrives in the browser with the right theme already.
 */
export async function getRequestTheme(): Promise<ThemeName> {
  const cookieStore = await cookies();
  return resolveProjectTheme(cookieStore.get(THEME_COOKIE_NAME)?.value);
}

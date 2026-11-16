/** The page a person gets after the login when no other page was asked for. */
export const DEFAULT_PATH_AFTER_LOGIN = "/";

/** The address of the login page in both web apps. */
export const LOGIN_PATH = "/login";

/**
 * The page to show after the login, from the value `next` of the address of
 * the login page. Only a path inside the app is accepted: it starts with one
 * `/`. Every other value, for example the address of another site, gives the
 * start page.
 */
export function safeNextPath(value: unknown): string {
  if (typeof value !== "string") {
    return DEFAULT_PATH_AFTER_LOGIN;
  }
  const isInsideTheApp =
    value.startsWith("/") && !value.startsWith("//") && !value.includes("\\");
  const isTheLoginPage =
    value === LOGIN_PATH ||
    value.startsWith(`${LOGIN_PATH}?`) ||
    value.startsWith(`${LOGIN_PATH}/`);
  return isInsideTheApp && !isTheLoginPage ? value : DEFAULT_PATH_AFTER_LOGIN;
}

/**
 * The address of the login page that returns to `currentPath` after the
 * login. The start page needs no `next` value.
 */
export function loginPathFor(currentPath: string): string {
  const nextPath = safeNextPath(currentPath);
  return nextPath === DEFAULT_PATH_AFTER_LOGIN
    ? LOGIN_PATH
    : `${LOGIN_PATH}?next=${encodeURIComponent(nextPath)}`;
}

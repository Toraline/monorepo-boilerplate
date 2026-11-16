/** The page a person gets after the login when no other page was asked for. */
export const DEFAULT_PATH_AFTER_LOGIN = "/";

/** The address of the login page in both web apps. */
export const LOGIN_PATH = "/login";

/**
 * True when the text holds a character that a browser deletes from an address
 * (a tab, a line break), or any other control character (code below 32, or
 * 127). A browser reads `/<tab>/example.com` as `//example.com`, which is
 * another site.
 */
function hasControlCharacter(text: string): boolean {
  return [...text].some((character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127;
  });
}

/**
 * True when the text is a path inside the app: it starts with one `/`, and it
 * holds no backslash (a browser reads `\` as `/`) and no control character.
 */
function isPathInsideTheApp(text: string): boolean {
  return (
    text.startsWith("/") &&
    !text.startsWith("//") &&
    !text.includes("\\") &&
    !hasControlCharacter(text)
  );
}

/** The text with its `%XX` codes decoded one time, or null when a code is broken. */
function decodedOnce(text: string): string | null {
  try {
    return decodeURIComponent(text);
  } catch {
    return null;
  }
}

/**
 * The page to show after the login, from the value `next` of the address of
 * the login page. Only a path inside the app is accepted: it starts with one
 * `/`, and it holds no backslash and no control character. The value must
 * pass the same check after its `%XX` codes are decoded one more time, so a
 * value that was encoded twice cannot become the address of another site
 * later. Every other value, for example the address of another site, gives
 * the start page.
 */
export function safeNextPath(value: unknown): string {
  if (typeof value !== "string") {
    return DEFAULT_PATH_AFTER_LOGIN;
  }
  const decodedValue = decodedOnce(value);
  const isInsideTheApp =
    isPathInsideTheApp(value) &&
    decodedValue !== null &&
    isPathInsideTheApp(decodedValue);
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

import { describe, expect, it } from "vitest";

import { resolveProjectTheme } from "./resolve-theme";

describe("resolveProjectTheme", () => {
  it.each(["light", "dark"])(
    "returns %s when the cookie has that theme",
    (cookieValue) => {
      expect(resolveProjectTheme(cookieValue)).toBe(cookieValue);
    },
  );

  it.each([undefined, null])(
    "returns the default theme, light, when the cookie is %s",
    (cookieValue) => {
      expect(resolveProjectTheme(cookieValue)).toBe("light");
    },
  );

  it.each(["", "blue", "DARK", " dark", "dark; Path=/", "<script>"])(
    "returns the default theme, light, for the invalid value %j",
    (cookieValue) => {
      expect(resolveProjectTheme(cookieValue)).toBe("light");
    },
  );
});

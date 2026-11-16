import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { buildThemeCss } from "../../scripts/build-theme-css.ts";

const generatedFile = path.join(__dirname, "theme.generated.css");

describe("theme.generated.css", () => {
  it("is the CSS of theme-config.ts; when this fails, run: npm run theme --workspace packages/ui", () => {
    expect(readFileSync(generatedFile, "utf8")).toBe(buildThemeCss());
  });

  it("has the main color of the project in the light theme and in the dark theme", () => {
    const css = readFileSync(generatedFile, "utf8");
    const [lightBlock, darkBlock] = css.split('[data-theme="dark"]');

    expect(lightBlock).toContain(':root,\n[data-theme="light"]');
    expect(lightBlock).toContain("--bg-primary: #6d28d9;");
    expect(darkBlock).toContain("--bg-primary: #c4b5fd;");
  });
});

import { createTailwindTheme, createTheme } from "@toraline.tech/tokens";

import { themeInputs } from "../src/theme/theme-config.ts";

const HEADER = `/*
 * Written by "npm run theme --workspace packages/ui" from src/theme/theme-config.ts.
 * Do not change this file by hand: change theme-config.ts and run the command.
 */
`;

/** The content of src/theme/theme.generated.css: every theme of this project as CSS variables. */
export function buildThemeCss(): string {
  const blocks = [
    createTailwindTheme(themeInputs),
    ...themeInputs.map((themeInput) => createTheme(themeInput)),
  ].filter((block) => block.trim() !== "");
  return `${HEADER}\n${blocks.map((block) => block.trim()).join("\n\n")}\n`;
}

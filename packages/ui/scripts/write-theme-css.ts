import { writeFileSync } from "node:fs";

import { themeInputs } from "../src/theme/theme-config.ts";
import { buildThemeCss } from "./build-theme-css.ts";

// Node 24 runs this TypeScript file directly: node scripts/write-theme-css.ts
writeFileSync(
  new URL("../src/theme/theme.generated.css", import.meta.url),
  buildThemeCss(),
);
console.log(
  `Wrote src/theme/theme.generated.css with ${themeInputs.length} themes.`,
);

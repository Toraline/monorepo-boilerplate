import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// The same rules as the apps and the packages, so code can move between them.
// One difference: a story may hold a text. The catalog is a tool for the
// people who write the code; it is in English only and has no messages files.
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // The catalog has no "pages" folder: the rule would look for one.
    rules: { "@next/next/no-html-link-for-pages": "off" },
  },
  // ESLint ignores a folder whose name starts with a dot. This line takes
  // .storybook out of that rule, so its files are checked too.
  globalIgnores(["storybook-static/**", "!.storybook"]),
]);

export default eslintConfig;

import { defineConfig } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// The same rules as the apps, so code can move between an app and this package.
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // This package has no "pages" folder: the rule would look for one.
    rules: { "@next/next/no-html-link-for-pages": "off" },
  },
]);

export default eslintConfig;

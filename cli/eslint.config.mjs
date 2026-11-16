import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

// The rules of the two commands and of the code they share.
const eslintConfig = defineConfig([
  globalIgnores(["**/dist/**", "**/node_modules/**"]),
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // The code style of the repository: no ternary inside a ternary, no one-letter name.
      "no-nested-ternary": "error",
      "id-length": ["error", { min: 2 }],
    },
  },
  {
    files: ["scripts/*.mjs"],
    languageOptions: { globals: { process: "readonly", console: "readonly" } },
  },
]);

export default eslintConfig;

import { defineConfig, globalIgnores } from "eslint/config";
import nextTs from "eslint-config-next/typescript";

// The TypeScript rules of the apps. The React rules are not here: this folder
// has no component.
const eslintConfig = defineConfig([
  ...nextTs,
  globalIgnores(["playwright-report/**", "test-results/**"]),
]);

export default eslintConfig;

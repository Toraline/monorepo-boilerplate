import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Every text that a person reads comes from src/i18n/messages, through
    // useTranslations. These rules refuse a text written directly in a
    // component: between tags, in braces, and in the attributes that a person
    // reads or hears. A test may name the expected text.
    files: ["src/**/*.tsx"],
    ignores: ["src/**/*.test.tsx", "src/test/**"],
    rules: {
      "react/jsx-no-literals": [
        "error",
        { noStrings: true, ignoreProps: true, noAttributeStrings: false },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "JSXAttribute[name.name=/^(alt|title|placeholder|label|aria-label|aria-description|aria-placeholder|aria-roledescription|aria-valuetext)$/] > Literal",
          message:
            "Do not write a text for a person in a component. Put it into src/i18n/messages and read it with useTranslations.",
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;

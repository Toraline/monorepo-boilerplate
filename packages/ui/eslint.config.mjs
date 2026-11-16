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
  {
    // A component of this package never holds a text for a person. The app
    // gives it the texts as props, from its messages files. These are the two
    // rules of the apps that refuse a text written directly in a component.
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
            "Do not write a text for a person in a component of this package. The app gives the text as a prop.",
        },
      ],
    },
  },
]);

export default eslintConfig;

import type { Locale } from "@repo/shared/i18n";

import type messages from "./messages/en.json";

// Tells TypeScript the languages and the keys of the texts. With it,
// `t("home.titel")` is a type error, because en.json has no such key.
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof messages;
  }
}

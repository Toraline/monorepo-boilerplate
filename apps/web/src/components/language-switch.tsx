import { useLocale, useTranslations } from "next-intl";

import { localeNames, locales } from "@repo/shared/i18n";
import { setLocale } from "@repo/shared/i18n/actions";
import { Button } from "@toraline.tech/ui";

/**
 * One button per language. A click sends the form to the Next.js server, which
 * keeps the language in a cookie and renders the page again in that language.
 * It works without JavaScript in the browser. Each button is a `Button` of the
 * library: the chosen language has the main color of the theme.
 */
export function LanguageSwitch() {
  const currentLocale = useLocale();
  const t = useTranslations("languageSwitch");

  return (
    <form
      action={setLocale}
      className="flex items-center gap-2 text-sm text-secondary"
    >
      <span id="language-switch-label">{t("label")}</span>
      <div
        role="group"
        aria-labelledby="language-switch-label"
        className="flex gap-1"
      >
        {locales.map((locale) => (
          <Button
            key={locale}
            variant={locale === currentLocale ? "primary" : "secondary"}
            size="sm"
            type="submit"
            name="locale"
            value={locale}
            lang={locale}
            aria-pressed={locale === currentLocale}
          >
            {localeNames[locale]}
          </Button>
        ))}
      </div>
    </form>
  );
}

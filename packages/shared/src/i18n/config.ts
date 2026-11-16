/**
 * The languages of the web apps. To add a language: add its code here and its
 * name in `localeNames`, then add one messages file per app.
 * A code is a BCP 47 language tag, the form that `<html lang>` and the header
 * `Accept-Language` use.
 */
export const locales = ["en", "pt-BR"] as const;

export type Locale = (typeof locales)[number];

/** The language of a first visit when the browser asks for none of `locales`. */
export const defaultLocale: Locale = "en";

/** The name of each language, written in that language. It is never translated. */
export const localeNames: Record<Locale, string> = {
  en: "English",
  "pt-BR": "Português (Brasil)",
};

/** The cookie that keeps the language a person chose. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

/** How long the browser keeps the cookie: 1 year, in seconds. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && locales.includes(value as Locale);
}

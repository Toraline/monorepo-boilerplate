import { defaultLocale, isLocale, locales, type Locale } from "./config";

/** The part of a language tag before the first "-": "pt" for "pt-BR". */
function primaryLanguage(tag: string): string {
  return tag.split("-")[0].toLowerCase();
}

/**
 * The language tags of an `Accept-Language` header, most wanted first.
 * Example: "pt-BR,pt;q=0.9,en;q=0.8" gives ["pt-BR", "pt", "en"].
 * A tag with `q=0` means "not accepted" and is left out.
 */
export function parseAcceptLanguage(header: string): string[] {
  return header
    .split(",")
    .map((part, index) => {
      const [tag, ...parameters] = part.trim().split(";");
      const quality = parameters
        .map((parameter) => parameter.trim())
        .find((parameter) => parameter.startsWith("q="));
      const weight = quality === undefined ? 1 : Number(quality.slice(2));
      return { tag: tag.trim(), weight, index };
    })
    .filter(
      ({ tag, weight }) => tag !== "" && tag !== "*" && weight > 0 && weight <= 1,
    )
    .sort((first, second) => second.weight - first.weight || first.index - second.index)
    .map(({ tag }) => tag);
}

/**
 * The first language of the header that the apps have, or undefined.
 * A tag matches a language with the same code ("pt-BR"), and otherwise the
 * first language with the same primary language ("pt" and "pt-PT" give "pt-BR",
 * "en-GB" gives "en").
 */
export function matchAcceptLanguage(
  header: string | null | undefined,
): Locale | undefined {
  if (!header) {
    return undefined;
  }
  for (const tag of parseAcceptLanguage(header)) {
    const exact = locales.find(
      (locale) => locale.toLowerCase() === tag.toLowerCase(),
    );
    if (exact) {
      return exact;
    }
    const sameLanguage = locales.find(
      (locale) => primaryLanguage(locale) === primaryLanguage(tag),
    );
    if (sameLanguage) {
      return sameLanguage;
    }
  }
  return undefined;
}

/**
 * The language of one request:
 * 1. the language of the cookie, when a person chose one;
 * 2. otherwise the language of the browser (`Accept-Language`), when the apps have it;
 * 3. otherwise English.
 */
export function resolveLocale(input: {
  cookieValue?: string | null;
  acceptLanguage?: string | null;
}): Locale {
  if (isLocale(input.cookieValue)) {
    return input.cookieValue;
  }
  return matchAcceptLanguage(input.acceptLanguage) ?? defaultLocale;
}

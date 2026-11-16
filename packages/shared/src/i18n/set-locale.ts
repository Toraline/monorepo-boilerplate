"use server";

import { cookies } from "next/headers";

import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, isLocale } from "./config";

/**
 * Keeps the language that a person chose, in a cookie. It is the `action` of
 * the form of the language switch: the form sends the field `locale`.
 * Next.js then renders the page again, in the new language.
 * A value that is not one of the languages of the apps changes nothing.
 */
export async function setLocale(formData: FormData): Promise<void> {
  const locale = formData.get("locale");
  if (!isLocale(locale)) {
    return;
  }
  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: "lax",
  });
}

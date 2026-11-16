import { cookies, headers } from "next/headers";

import { LOCALE_COOKIE, type Locale } from "./config";
import { resolveLocale } from "./resolve-locale";

/**
 * The language of the request that the Next.js server is answering now.
 * Only for code that runs on the server: it reads the cookie of the language
 * and the header `Accept-Language`.
 */
export async function getRequestLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const headerList = await headers();
  return resolveLocale({
    cookieValue: cookieStore.get(LOCALE_COOKIE)?.value,
    acceptLanguage: headerList.get("accept-language"),
  });
}

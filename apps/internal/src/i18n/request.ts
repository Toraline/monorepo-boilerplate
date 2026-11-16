import { getRequestConfig } from "next-intl/server";

import { getRequestLocale } from "@repo/shared/i18n/server";

// next-intl calls this function once for each request that the Next.js server
// answers. It says which language the request gets and loads the texts of that
// language. next.config.ts names this file.
export default getRequestConfig(async () => {
  const locale = await getRequestLocale();
  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});

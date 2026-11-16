import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";

import { QueryProviders } from "@repo/shared/query";
import { themes } from "@repo/ui/theme";
import { getRequestTheme } from "@repo/ui/theme/server";
import { ThemeProvider } from "@toraline.tech/ui/theme";

import { LanguageSwitch } from "@/components/language-switch";
import { ThemeSwitch } from "@/components/theme-switch";
import { UserMenu } from "@/features/auth";

import { inter, poppins } from "./fonts";

import "@/styles/globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The language of this request: the cookie, then the browser, then English.
  const locale = await getLocale();
  // The theme of this request: the theme cookie, then the light theme. The
  // server writes it on <html>, so the page never shows the wrong theme first.
  const theme = await getRequestTheme();

  return (
    <html
      lang={locale}
      data-theme={theme}
      className={`${inter.variable} ${poppins.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-page text-primary">
        <NextIntlClientProvider>
          <QueryProviders>
            <ThemeProvider themes={themes} initialTheme={theme}>
              <header className="flex flex-wrap items-center justify-end gap-4 p-4">
                <LanguageSwitch />
                <ThemeSwitch />
                <UserMenu />
              </header>
              {children}
            </ThemeProvider>
          </QueryProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderResult } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";

import type { Locale } from "@repo/shared/i18n";

import en from "@/i18n/messages/en.json";
import ptBR from "@/i18n/messages/pt-BR.json";

const messagesByLocale = { en, "pt-BR": ptBR };

/** Renders a component in a test with the texts of one language. English when none is given. */
export function renderWithMessages(
  ui: ReactElement,
  locale: Locale = "en",
): RenderResult {
  return render(
    <NextIntlClientProvider
      locale={locale}
      messages={messagesByLocale[locale]}
      timeZone="UTC"
    >
      {ui}
    </NextIntlClientProvider>,
  );
}

/**
 * Renders a component that sends requests: with the texts of one language and
 * a new TanStack Query client that does not send a failed request again.
 */
export function renderWithProviders(
  ui: ReactElement,
  locale: Locale = "en",
): RenderResult & { queryClient: QueryClient } {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const result = renderWithMessages(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
    locale,
  );
  return { ...result, queryClient };
}

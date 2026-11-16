import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const request = vi.hoisted(() => ({ locale: "en", theme: "light" }));

vi.mock("next-intl", () => ({
  NextIntlClientProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("next-intl/server", () => ({
  getLocale: async () => request.locale,
  getTranslations: async () => (key: string) => key,
}));
vi.mock("@repo/ui/theme/server", () => ({
  getRequestTheme: async () => request.theme,
}));
vi.mock("./fonts", () => ({
  inter: { variable: "inter-variable" },
  poppins: { variable: "poppins-variable" },
}));
vi.mock("@/components/language-switch", () => ({
  LanguageSwitch: () => <div data-testid="language-switch" />,
}));
vi.mock("@/components/theme-switch", () => ({
  ThemeSwitch: () => <div data-testid="theme-switch" />,
}));

vi.mock("@/features/auth", () => ({
  UserMenu: () => <div data-testid="user-menu" />,
}));

import RootLayout from "./layout";

async function renderLayout(): Promise<string> {
  return renderToStaticMarkup(
    await RootLayout({ children: <main data-testid="page" /> }),
  );
}

beforeEach(() => {
  request.locale = "en";
  request.theme = "light";
});

describe("RootLayout", () => {
  it("writes the language, the light theme and the two fonts on <html>", async () => {
    const html = await renderLayout();

    expect(html).toContain('<html lang="en" data-theme="light"');
    expect(html).toContain("inter-variable poppins-variable");
  });

  it("writes the dark theme on <html> when the request has the dark theme", async () => {
    request.locale = "pt-BR";
    request.theme = "dark";

    const html = await renderLayout();

    expect(html).toContain('<html lang="pt-BR" data-theme="dark"');
  });

  it("gives the page the colors of the theme, and shows the language switch, the theme switch, the user menu and the page", async () => {
    const html = await renderLayout();

    expect(html).toContain("bg-page text-primary");
    expect(html.indexOf('data-testid="language-switch"')).toBeGreaterThan(-1);
    expect(html.indexOf('data-testid="theme-switch"')).toBeGreaterThan(
      html.indexOf('data-testid="language-switch"'),
    );
    expect(html.indexOf('data-testid="user-menu"')).toBeGreaterThan(
      html.indexOf('data-testid="theme-switch"'),
    );
    expect(html).toContain('data-testid="page"');
  });
});

import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithMessages } from "@/test/render";

import LoginPage from "./page";

vi.mock("@/features/auth", () => ({
  LoginScreen: ({ nextPath }: { nextPath: string }) => (
    <div data-testid="login-screen">{nextPath}</div>
  ),
}));

async function renderPage(next?: string) {
  renderWithMessages(
    await LoginPage({ searchParams: Promise.resolve({ next }) }),
  );
}

describe("LoginPage", () => {
  it("gives the login screen the page to return to", async () => {
    await renderPage("/?tag=2");

    expect(screen.getByTestId("login-screen").textContent).toBe("/?tag=2");
  });

  // Next.js decodes the address before the page reads it: `?next=/%09/…`
  // arrives here as a slash, a tab, a slash.
  it.each([
    ["the address of another site", "https://example.com/"],
    ["an address without its protocol", "//example.com/x"],
    ["a tab between two slashes", "/\t/example.com/x"],
    ["a line break between two slashes", "/\n/example.com/x"],
    ["a carriage return between two slashes", "/\r/example.com/x"],
    ["a backslash", "/\\example.com/x"],
    ["an encoded tab that is still encoded", "/%09/example.com/x"],
  ])("returns to the start page when the address names %s", async (_name, next) => {
    await renderPage(next);

    expect(screen.getByTestId("login-screen").textContent).toBe("/");
  });
});

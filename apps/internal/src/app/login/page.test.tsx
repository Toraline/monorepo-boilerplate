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

    expect(screen.getByTestId("login-screen")).toHaveTextContent("/?tag=2");
  });

  it("returns to the start page when the address names another site", async () => {
    await renderPage("https://example.com/");

    expect(screen.getByTestId("login-screen")).toHaveTextContent("/");
  });
});

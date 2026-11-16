import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { mockServer, noAnswer } from "@repo/shared/testing";

import { navigation, resetNavigation } from "@/test/navigation";
import { renderWithProviders } from "@/test/render";

import { LoginScreen } from "./login-screen";

vi.mock("next/navigation", async () =>
  (await import("@/test/navigation")).navigationMock(),
);

const admin = {
  id: 1,
  name: "Sample Admin",
  email: "admin@example.com",
  isAdmin: true,
};

const nobody = () => Response.json({ detail: "No login." }, { status: 401 });

function fillAndSend(email: string, password: string) {
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: email },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: password },
  });
  fireEvent.click(screen.getByRole("button", { name: "Log in" }));
}

beforeEach(() => {
  resetNavigation();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("LoginScreen", () => {
  it("logs an admin in and shows the page that the admin asked for", async () => {
    const server = mockServer({
      "GET /api/auth/me/": nobody,
      "POST /api/auth/login/": () => Response.json(admin),
    });
    renderWithProviders(<LoginScreen nextPath="/todos?owner=4" />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Log in" }),
    ).toBeInTheDocument();
    fillAndSend("admin@example.com", "sample-password");

    await waitFor(() =>
      expect(navigation.replace).toHaveBeenCalledWith("/todos?owner=4"),
    );
    expect(server.requestsTo("POST /api/auth/login/")[0].body).toEqual({
      email: "admin@example.com",
      password: "sample-password",
    });
  });

  it("shows one clear message for a wrong password, and the fields keep what was typed", async () => {
    mockServer({
      "GET /api/auth/me/": nobody,
      "POST /api/auth/login/": () =>
        Response.json(
          { detail: "The email or the password is not correct." },
          { status: 401 },
        ),
    });
    renderWithProviders(<LoginScreen nextPath="/" />);

    fillAndSend("admin@example.com", "wrong-password");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The email or the password is not correct.",
    );
    expect(screen.getByLabelText("Email")).toHaveValue("admin@example.com");
    expect(screen.getByLabelText("Password")).toHaveValue("wrong-password");
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it("says that the server did not answer when the login request fails", async () => {
    mockServer({
      "GET /api/auth/me/": nobody,
      "POST /api/auth/login/": noAnswer,
    });
    renderWithProviders(<LoginScreen nextPath="/" />);

    fillAndSend("admin@example.com", "sample-password");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The server did not answer. Try again.",
    );
  });

  it("shows the Portuguese texts on a Portuguese page", () => {
    mockServer({ "GET /api/auth/me/": nobody });

    renderWithProviders(<LoginScreen nextPath="/" />, "pt-BR");

    expect(
      screen.getByRole("heading", { level: 1, name: "Entrar" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Senha")).toBeInTheDocument();
  });
});

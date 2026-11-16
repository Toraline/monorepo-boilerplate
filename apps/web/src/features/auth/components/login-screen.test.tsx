import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { mockServer, noAnswer } from "@repo/shared/testing";

import { navigation, resetNavigation } from "@/test/navigation";
import { renderWithProviders } from "@/test/render";

import { LoginScreen } from "./login-screen";

vi.mock("next/navigation", async () =>
  (await import("@/test/navigation")).navigationMock(),
);

const user = {
  id: 4,
  name: "Ana Lima",
  email: "ana.lima@example.com",
  isAdmin: false,
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
  it("logs in and shows the page that the person asked for", async () => {
    const server = mockServer({
      "GET /api/auth/me/": nobody,
      "POST /api/auth/login/": () => Response.json(user),
    });
    renderWithProviders(<LoginScreen nextPath="/?completed=true" />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Log in" }),
    ).toBeInTheDocument();
    fillAndSend("ana.lima@example.com", "sample-password");

    await waitFor(() =>
      expect(navigation.replace).toHaveBeenCalledWith("/?completed=true"),
    );
    expect(server.requestsTo("POST /api/auth/login/")[0].body).toEqual({
      email: "ana.lima@example.com",
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

    fillAndSend("ana.lima@example.com", "wrong-password");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The email or the password is not correct.",
    );
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    expect(screen.getByLabelText("Email")).toHaveValue("ana.lima@example.com");
    expect(screen.getByLabelText("Password")).toHaveValue("wrong-password");
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it("shows a message on an empty field and sends no login", async () => {
    const server = mockServer({ "GET /api/auth/me/": nobody });
    renderWithProviders(<LoginScreen nextPath="/" />);

    fireEvent.click(screen.getByRole("button", { name: "Log in" }));

    expect(screen.getByLabelText("Email")).toHaveAccessibleDescription(
      "Type your email.",
    );
    expect(screen.getByLabelText("Password")).toHaveAccessibleDescription(
      "Type your password.",
    );
    expect(server.requestsTo("POST /api/auth/login/")).toHaveLength(0);
  });

  it("says that the server did not answer when the login request fails", async () => {
    mockServer({
      "GET /api/auth/me/": nobody,
      "POST /api/auth/login/": noAnswer,
    });
    renderWithProviders(<LoginScreen nextPath="/" />);

    fillAndSend("ana.lima@example.com", "sample-password");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The server did not answer. Try again.",
    );
  });

  it("shows the next page at once to a person who is already logged in", async () => {
    mockServer({ "GET /api/auth/me/": () => Response.json(user) });
    renderWithProviders(<LoginScreen nextPath="/" />);

    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/"));
  });

  it("shows the Portuguese texts on a Portuguese page", async () => {
    mockServer({
      "GET /api/auth/me/": nobody,
      "POST /api/auth/login/": () => Response.json({}, { status: 401 }),
    });
    renderWithProviders(<LoginScreen nextPath="/" />, "pt-BR");

    expect(
      screen.getByRole("heading", { level: 1, name: "Entrar" }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("E-mail"), {
      target: { value: "ana.lima@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Senha"), {
      target: { value: "wrong-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "O e-mail ou a senha não está correto.",
    );
  });
});

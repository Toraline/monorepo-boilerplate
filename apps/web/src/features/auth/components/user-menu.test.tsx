import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { currentUserQueryKey } from "@repo/shared/auth";
import { mockServer } from "@repo/shared/testing";

import { renderWithProviders } from "@/test/render";

import { UserMenu } from "./user-menu";

const user = {
  id: 4,
  name: "Ana Lima",
  email: "ana.lima@example.com",
  isAdmin: false,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("UserMenu", () => {
  it("shows the name of the user and the logout button", async () => {
    mockServer({ "GET /api/auth/me/": () => Response.json(user) });

    renderWithProviders(<UserMenu />);

    expect(await screen.findByText("Logged in as Ana Lima")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
  });

  it("shows nothing when nobody is logged in", async () => {
    const server = mockServer({
      "GET /api/auth/me/": () => Response.json({}, { status: 401 }),
    });

    renderWithProviders(<UserMenu />);

    await waitFor(() => expect(server.requests).toHaveLength(1));
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("ends the session on a press of the logout button, and forgets the answers of the user", async () => {
    const server = mockServer({
      "GET /api/auth/me/": () => Response.json(user),
      "POST /api/auth/logout/": () => new Response(null, { status: 204 }),
    });
    const { queryClient } = renderWithProviders(<UserMenu />);
    queryClient.setQueryData(["todos"], ["a todo of the user"]);

    fireEvent.click(await screen.findByRole("button", { name: "Log out" }));

    await waitFor(() =>
      expect(screen.queryByRole("button")).not.toBeInTheDocument(),
    );
    expect(server.requestsTo("POST /api/auth/logout/")).toHaveLength(1);
    // Nobody is logged in now: the pages that need a login show the login page.
    expect(queryClient.getQueryData(currentUserQueryKey)).toBeNull();
    expect(queryClient.getQueryData(["todos"])).toBeUndefined();
  });

  it("says that the logout failed when the server fails", async () => {
    mockServer({
      "GET /api/auth/me/": () => Response.json(user),
      "POST /api/auth/logout/": () => Response.json({}, { status: 500 }),
    });
    renderWithProviders(<UserMenu />);

    fireEvent.click(await screen.findByRole("button", { name: "Log out" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The logout failed. Try again.",
    );
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
  });

  it("shows the Portuguese texts on a Portuguese page", async () => {
    mockServer({ "GET /api/auth/me/": () => Response.json(user) });

    renderWithProviders(<UserMenu />, "pt-BR");

    expect(await screen.findByText("Logado como Ana Lima")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sair" })).toBeInTheDocument();
  });
});

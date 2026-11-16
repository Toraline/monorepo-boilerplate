import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { currentUserQueryKey } from "@repo/shared/auth";
import { mockServer } from "@repo/shared/testing";

import { navigation, resetNavigation } from "@/test/navigation";
import { renderWithProviders } from "@/test/render";

import { AdminMenu } from "./admin-menu";
import { RequireAdmin } from "./require-admin";
import { UserMenu } from "./user-menu";

vi.mock("next/navigation", async () =>
  (await import("@/test/navigation")).navigationMock(),
);

const admin = {
  id: 1,
  name: "Sample Admin",
  email: "admin@example.com",
  isAdmin: true,
};
const user = {
  id: 4,
  name: "Ana Lima",
  email: "ana.lima@example.com",
  isAdmin: false,
};

/** The page as the layouts build it: the top bar, then the guarded area. */
function renderApp(locale: "en" | "pt-BR" = "en") {
  return renderWithProviders(
    <>
      <UserMenu />
      <RequireAdmin>
        <AdminMenu />
        <p>The page of an area</p>
      </RequireAdmin>
    </>,
    locale,
  );
}

beforeEach(() => {
  resetNavigation();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("RequireAdmin: an admin", () => {
  it("gets in: the page, the menu with the 3 areas, and the logout button", async () => {
    mockServer({ "GET /api/auth/me/": () => Response.json(admin) });
    navigation.pathname = "/todos";

    renderApp();

    expect(screen.getByRole("status")).toHaveTextContent("Checking your login.");
    expect(await screen.findByText("The page of an area")).toBeInTheDocument();
    const menu = screen.getByRole("navigation", { name: "Areas" });
    expect(
      Array.from(menu.querySelectorAll("a")).map((link) => [
        link.textContent,
        link.getAttribute("href"),
      ]),
    ).toEqual([
      ["Tags", "/tags"],
      ["Todos", "/todos"],
      ["History", "/history"],
    ]);
    expect(screen.getByRole("link", { name: "Todos" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Tags" })).not.toHaveAttribute(
      "aria-current",
    );
    expect(screen.getByText("Logged in as Sample Admin")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it("logs out with the button at the top, and is then sent to the login page", async () => {
    const server = mockServer({
      "GET /api/auth/me/": () => Response.json(admin),
      "POST /api/auth/logout/": () => new Response(null, { status: 204 }),
    });
    navigation.pathname = "/history";
    renderApp();

    fireEvent.click(await screen.findByRole("button", { name: "Log out" }));

    await waitFor(() =>
      expect(navigation.replace).toHaveBeenCalledWith("/login?next=%2Fhistory"),
    );
    expect(server.requestsTo("POST /api/auth/logout/")).toHaveLength(1);
    expect(screen.queryByText("The page of an area")).not.toBeInTheDocument();
  });
});

describe("RequireAdmin: a user who is not an admin", () => {
  it("is refused: the no access page with a logout button, and no other page", async () => {
    mockServer({ "GET /api/auth/me/": () => Response.json(user) });
    navigation.pathname = "/tags";

    renderApp();

    expect(
      await screen.findByRole("heading", { level: 1, name: "You have no access" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "This app is for admins only. The user ana.lima@example.com is not an admin.",
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Log out" })).toHaveLength(1);
    expect(screen.queryByText("The page of an area")).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it("logs out with the button of the no access page, and is then sent to the login page", async () => {
    const server = mockServer({
      "GET /api/auth/me/": () => Response.json(user),
      "POST /api/auth/logout/": () => new Response(null, { status: 204 }),
    });
    const { queryClient } = renderApp();

    fireEvent.click(await screen.findByRole("button", { name: "Log out" }));

    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/login"));
    expect(server.requestsTo("POST /api/auth/logout/")).toHaveLength(1);
    expect(queryClient.getQueryData(currentUserQueryKey)).toBeNull();
    expect(
      screen.queryByRole("heading", { name: "You have no access" }),
    ).not.toBeInTheDocument();
  });

  it("says that the logout failed when the server fails", async () => {
    mockServer({
      "GET /api/auth/me/": () => Response.json(user),
      "POST /api/auth/logout/": () => Response.json({}, { status: 500 }),
    });
    renderApp();

    fireEvent.click(await screen.findByRole("button", { name: "Log out" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The logout failed. Try again.",
    );
  });

  it("shows the Portuguese texts on a Portuguese page", async () => {
    mockServer({ "GET /api/auth/me/": () => Response.json(user) });

    renderApp("pt-BR");

    expect(
      await screen.findByRole("heading", { level: 1, name: "Você não tem acesso" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sair" })).toBeInTheDocument();
  });
});

describe("RequireAdmin: a person without a login", () => {
  it("is sent to the login page, which names the page to return to", async () => {
    mockServer({
      "GET /api/auth/me/": () => Response.json({}, { status: 401 }),
    });
    navigation.pathname = "/todos";
    navigation.search = "owner=4&completed=true";

    renderApp();

    await waitFor(() =>
      expect(navigation.replace).toHaveBeenCalledWith(
        "/login?next=%2Ftodos%3Fowner%3D4%26completed%3Dtrue",
      ),
    );
    expect(screen.queryByText("The page of an area")).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Log out" })).not.toBeInTheDocument();
  });

  it("is sent to the login page from every area", async () => {
    mockServer({
      "GET /api/auth/me/": () => Response.json({}, { status: 401 }),
    });
    navigation.pathname = "/history";

    renderApp();

    await waitFor(() =>
      expect(navigation.replace).toHaveBeenCalledWith("/login?next=%2Fhistory"),
    );
  });
});

describe("RequireAdmin: the server fails", () => {
  it("says that the server failed, and asks again on a press of the button", async () => {
    const server = mockServer({
      "GET /api/auth/me/": () => Response.json({}, { status: 500 }),
    });

    renderApp();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The server did not say whether you are logged in.",
    );

    server.use({ "GET /api/auth/me/": () => Response.json(admin) });
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("The page of an area")).toBeInTheDocument();
  });

  it("shows the menu in Portuguese on a Portuguese page", async () => {
    mockServer({ "GET /api/auth/me/": () => Response.json(admin) });

    renderApp("pt-BR");

    expect(
      await screen.findByRole("navigation", { name: "Áreas" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Etiquetas" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Histórico" })).toBeInTheDocument();
  });
});

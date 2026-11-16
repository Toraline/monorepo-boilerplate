import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { mockServer } from "@repo/shared/testing";

import { navigation, resetNavigation } from "@/test/navigation";
import { renderWithProviders } from "@/test/render";

import { RequireLogin } from "./require-login";

vi.mock("next/navigation", async () =>
  (await import("@/test/navigation")).navigationMock(),
);

const user = {
  id: 4,
  name: "Ana Lima",
  email: "ana.lima@example.com",
  isAdmin: false,
};

function renderGuard() {
  return renderWithProviders(
    <RequireLogin>
      <p>The page</p>
    </RequireLogin>,
  );
}

beforeEach(() => {
  resetNavigation();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("RequireLogin", () => {
  it("shows the page to a person who is logged in", async () => {
    mockServer({ "GET /api/auth/me/": () => Response.json(user) });

    renderGuard();

    expect(screen.getByRole("status")).toHaveTextContent("Checking your login.");
    expect(await screen.findByText("The page")).toBeInTheDocument();
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it("sends a person without a login to the login page, which names the page to return to", async () => {
    mockServer({
      "GET /api/auth/me/": () => Response.json({}, { status: 401 }),
    });
    navigation.pathname = "/";
    navigation.search = "completed=true&tag=2";

    renderGuard();

    await waitFor(() =>
      expect(navigation.replace).toHaveBeenCalledWith(
        "/login?next=%2F%3Fcompleted%3Dtrue%26tag%3D2",
      ),
    );
    expect(screen.queryByText("The page")).not.toBeInTheDocument();
  });

  it("sends a person without a login from the start page to the plain login page", async () => {
    mockServer({
      "GET /api/auth/me/": () => Response.json({}, { status: 401 }),
    });

    renderGuard();

    await waitFor(() =>
      expect(navigation.replace).toHaveBeenCalledWith("/login"),
    );
  });

  it("says that the server failed, and asks again on a press of the button", async () => {
    const server = mockServer({
      "GET /api/auth/me/": () => Response.json({}, { status: 500 }),
    });

    renderGuard();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The server did not say whether you are logged in.",
    );
    expect(navigation.replace).not.toHaveBeenCalled();

    server.use({ "GET /api/auth/me/": () => Response.json(user) });
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("The page")).toBeInTheDocument();
  });
});

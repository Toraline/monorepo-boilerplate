import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../api/client";
import { fetchCurrentUser, login, logout } from "./user";

const user = {
  id: 4,
  name: "Ana Lima",
  email: "ana.lima@example.com",
  isAdmin: false,
};

type Route = (request: { url: string; init: RequestInit }) => Response;

/** Replaces `fetch`. The CSRF request always gets a token. */
function stubFetch(route: Route) {
  const fetchMock = vi.fn(async (url: string, init: RequestInit = {}) => {
    if (url.endsWith("/api/auth/csrf/")) {
      return Response.json({ csrfToken: "sample-token" });
    }
    return route({ url, init });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchCurrentUser", () => {
  it("returns the user who is logged in", async () => {
    stubFetch(() => Response.json(user));

    await expect(fetchCurrentUser()).resolves.toEqual(user);
  });

  it("returns null when nobody is logged in", async () => {
    stubFetch(() => Response.json({ detail: "No login." }, { status: 401 }));

    await expect(fetchCurrentUser()).resolves.toBeNull();
  });

  it("throws when the server fails", async () => {
    stubFetch(() => Response.json({}, { status: 500 }));

    await expect(fetchCurrentUser()).rejects.toBeInstanceOf(ApiError);
  });

  it("throws when the answer is not a user", async () => {
    stubFetch(() => Response.json({ id: "four" }));

    await expect(fetchCurrentUser()).rejects.toThrow();
  });
});

describe("login", () => {
  it("sends the email and the password with the CSRF token, and returns the user", async () => {
    const fetchMock = stubFetch(() => Response.json(user));

    await expect(
      login({ email: "ana.lima@example.com", password: "sample-password" }),
    ).resolves.toEqual(user);

    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe("http://localhost:8000/api/auth/login/");
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("X-CSRFToken")).toBe("sample-token");
    expect(JSON.parse(String(init?.body))).toEqual({
      email: "ana.lima@example.com",
      password: "sample-password",
    });
  });

  it("throws an ApiError with status 401 for a wrong password", async () => {
    stubFetch(() =>
      Response.json(
        { detail: "The email or the password is not correct." },
        { status: 401 },
      ),
    );

    await expect(
      login({ email: "ana.lima@example.com", password: "wrong" }),
    ).rejects.toMatchObject({ status: 401 });
  });
});

describe("logout", () => {
  it("sends POST /api/auth/logout/", async () => {
    const fetchMock = stubFetch(() => new Response(null, { status: 204 }));

    await expect(logout()).resolves.toBeUndefined();
    expect(fetchMock.mock.calls[1][0]).toBe(
      "http://localhost:8000/api/auth/logout/",
    );
  });

  it("passes when the login had already ended", async () => {
    stubFetch(() => Response.json({}, { status: 401 }));

    await expect(logout()).resolves.toBeUndefined();
  });

  it("throws when the server fails", async () => {
    stubFetch(() => Response.json({}, { status: 500 }));

    await expect(logout()).rejects.toMatchObject({ status: 500 });
  });
});

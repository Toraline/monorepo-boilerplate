import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetClientEnvForTests } from "../env/client-env";
import {
  ApiError,
  apiFetch,
  apiUrl,
  fetchCsrfToken,
  isApiError,
  isNetworkError,
} from "./client";

type FetchCall = { url: string; init: RequestInit };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Replaces `fetch` with a function that returns the given answers in order. */
function mockFetch(...responses: Array<Response | Error>) {
  const calls: FetchCall[] = [];
  const fetchMock = vi.fn(async (url: string, init: RequestInit = {}) => {
    calls.push({ url, init });
    const next = responses.shift();
    if (next === undefined) {
      throw new Error(`Unexpected request to ${url}`);
    }
    if (next instanceof Error) {
      throw next;
    }
    return next;
  });
  vi.stubGlobal("fetch", fetchMock);
  return calls;
}

function header(call: FetchCall, name: string): string | null {
  return new Headers(call.init.headers).get(name);
}

async function failureOf(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => {
      throw new Error("The request did not fail");
    },
    (error: unknown) => error,
  );
}

beforeEach(() => {
  resetClientEnvForTests();
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://server.test:8000");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  resetClientEnvForTests();
});

describe("apiUrl", () => {
  it("joins the address of the server and the path", () => {
    expect(apiUrl("/api/health/")).toBe("http://server.test:8000/api/health/");
  });

  it("ignores a slash at the end of the address of the server", () => {
    resetClientEnvForTests();
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://server.test:8000/");
    expect(apiUrl("/api/health/")).toBe("http://server.test:8000/api/health/");
  });

  it("uses http://localhost:8000 when the variable is not set", () => {
    resetClientEnvForTests();
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "");
    expect(apiUrl("/api/health/")).toBe("http://localhost:8000/api/health/");
  });

  it("refuses a value that is not an address", () => {
    resetClientEnvForTests();
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "not an address");
    expect(() => apiUrl("/api/health/")).toThrow();
  });
});

describe("apiFetch, a request that reads", () => {
  it("sends the cookies and returns the JSON body", async () => {
    const calls = mockFetch(jsonResponse({ status: "ok" }));

    const data = await apiFetch<{ status: string }>("/api/health/");

    expect(data).toEqual({ status: "ok" });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("http://server.test:8000/api/health/");
    expect(calls[0].init.method).toBe("GET");
    expect(calls[0].init.credentials).toBe("include");
    expect(header(calls[0], "Accept")).toBe("application/json");
  });

  it("does not ask for the CSRF token", async () => {
    const calls = mockFetch(jsonResponse({}));

    await apiFetch("/api/todos/");

    expect(calls.map((call) => call.url)).toEqual([
      "http://server.test:8000/api/todos/",
    ]);
    expect(header(calls[0], "X-CSRFToken")).toBeNull();
  });
});

describe("apiFetch, a request that changes data", () => {
  it.each(["POST", "PUT", "PATCH", "DELETE"])(
    "%s first gets the CSRF token and sends it in X-CSRFToken",
    async (method) => {
      const calls = mockFetch(
        jsonResponse({ csrfToken: "sample-token" }),
        jsonResponse({ id: 7 }),
      );

      await apiFetch("/api/todos/7/", { method });

      expect(calls).toHaveLength(2);
      expect(calls[0].url).toBe("http://server.test:8000/api/auth/csrf/");
      expect(calls[0].init.method).toBe("GET");
      expect(calls[0].init.credentials).toBe("include");
      expect(calls[1].url).toBe("http://server.test:8000/api/todos/7/");
      expect(calls[1].init.method).toBe(method);
      expect(calls[1].init.credentials).toBe("include");
      expect(header(calls[1], "X-CSRFToken")).toBe("sample-token");
    },
  );

  it("accepts the method in lower case", async () => {
    const calls = mockFetch(
      jsonResponse({ csrfToken: "sample-token" }),
      jsonResponse({}),
    );

    await apiFetch("/api/todos/", { method: "post" });

    expect(calls[1].init.method).toBe("POST");
    expect(header(calls[1], "X-CSRFToken")).toBe("sample-token");
  });

  it("asks for a new token on each request, because a login changes it", async () => {
    const calls = mockFetch(
      jsonResponse({ csrfToken: "token-before-login" }),
      jsonResponse({ user: {} }),
      jsonResponse({ csrfToken: "token-after-login" }),
      jsonResponse({ id: 1 }),
    );

    await apiFetch("/api/auth/login/", { method: "POST", json: {} });
    await apiFetch("/api/todos/", { method: "POST", json: {} });

    expect(header(calls[1], "X-CSRFToken")).toBe("token-before-login");
    expect(header(calls[3], "X-CSRFToken")).toBe("token-after-login");
  });

  it("sends `json` as a JSON body with the Content-Type header", async () => {
    const calls = mockFetch(
      jsonResponse({ csrfToken: "sample-token" }),
      jsonResponse({ id: 1 }, 201),
    );

    const data = await apiFetch<{ id: number }>("/api/todos/", {
      method: "POST",
      json: { title: "Buy milk" },
    });

    expect(data).toEqual({ id: 1 });
    expect(calls[1].init.body).toBe('{"title":"Buy milk"}');
    expect(header(calls[1], "Content-Type")).toBe("application/json");
  });

  it("returns undefined for an answer with status 204", async () => {
    mockFetch(
      jsonResponse({ csrfToken: "sample-token" }),
      new Response(null, { status: 204 }),
    );

    const data = await apiFetch("/api/todos/7/", { method: "DELETE" });

    expect(data).toBeUndefined();
  });

  it("does not send the request when the token request fails", async () => {
    const calls = mockFetch(jsonResponse({ detail: "Server error" }, 500));

    const error = await failureOf(apiFetch("/api/todos/", { method: "POST" }));

    expect(isApiError(error)).toBe(true);
    expect((error as ApiError).status).toBe(500);
    expect(calls).toHaveLength(1);
  });
});

describe("fetchCsrfToken", () => {
  it("returns the token of the body", async () => {
    mockFetch(jsonResponse({ csrfToken: "sample-token" }));

    await expect(fetchCsrfToken()).resolves.toBe("sample-token");
  });

  it("fails with an ApiError when the body has no token", async () => {
    mockFetch(jsonResponse({}));

    const error = await failureOf(fetchCsrfToken());

    expect(isApiError(error)).toBe(true);
  });
});

describe("apiFetch, an answer with an error", () => {
  it("turns the answer into an ApiError with the status, the body and the detail", async () => {
    mockFetch(
      jsonResponse(
        { detail: "Authentication credentials were not provided." },
        401,
      ),
    );

    const error = await failureOf(apiFetch("/api/auth/me/"));

    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.status).toBe(401);
    expect(apiError.body).toEqual({
      detail: "Authentication credentials were not provided.",
    });
    expect(apiError.detail).toBe(
      "Authentication credentials were not provided.",
    );
    expect(apiError.message).toBe("GET /api/auth/me/ failed with status 401");
    expect(isNetworkError(apiError)).toBe(false);
  });

  it("keeps the errors of the fields in the body", async () => {
    mockFetch(
      jsonResponse({ csrfToken: "sample-token" }),
      jsonResponse({ title: ["This field is required."] }, 400),
    );

    const error = await failureOf(
      apiFetch("/api/todos/", { method: "POST", json: {} }),
    );

    const apiError = error as ApiError;
    expect(apiError.status).toBe(400);
    expect(apiError.body).toEqual({ title: ["This field is required."] });
    expect(apiError.detail).toBeNull();
  });

  it("has a null body when the answer is not JSON", async () => {
    mockFetch(new Response("<h1>Server Error</h1>", { status: 500 }));

    const error = await failureOf(apiFetch("/api/health/"));

    const apiError = error as ApiError;
    expect(apiError.status).toBe(500);
    expect(apiError.body).toBeNull();
    expect(apiError.detail).toBeNull();
  });

  it("turns no answer from the server into an ApiError with status 0", async () => {
    mockFetch(new TypeError("Failed to fetch"));

    const error = await failureOf(apiFetch("/api/health/"));

    expect(isApiError(error)).toBe(true);
    expect((error as ApiError).status).toBe(0);
    expect(isNetworkError(error)).toBe(true);
  });

  it("leaves a cancelled request as it is", async () => {
    const abort = new DOMException("aborted", "AbortError");
    mockFetch(abort);

    await expect(apiFetch("/api/health/")).rejects.toBe(abort);
  });
});

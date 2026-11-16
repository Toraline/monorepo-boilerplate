import { vi } from "vitest";

/** One request that a test sent to the replaced `fetch`. */
export type MockRequest = {
  /** The method, in upper case. */
  method: string;
  /** The path without the values after `?`, for example `/api/todos/7/`. */
  path: string;
  /** The values after `?` in the address. */
  searchParams: URLSearchParams;
  /** The JSON body, or `undefined` when the request had none. */
  body: unknown;
};

/** What a route answers: a `Response`, or an error to say "no answer at all". */
export type MockRoute = (
  request: MockRequest,
) => Response | Promise<Response>;

/** The routes of a test. A key is the method and the path: `"GET /api/todos/"`. */
export type MockRoutes = Record<string, MockRoute>;

export type MockServer = {
  /** Every request that was sent, in order, without the CSRF requests. */
  requests: MockRequest[];
  /** The requests of one route, for example `"POST /api/todos/"`. */
  requestsTo: (route: string) => MockRequest[];
  /** Adds or replaces routes while a test runs. */
  use: (routes: MockRoutes) => void;
};

/**
 * Replaces `fetch` in a test with a small server. `GET /api/auth/csrf/`
 * always answers with a token. A request with no route fails the test with a
 * message that names it. Call `vi.unstubAllGlobals()` after each test.
 */
export function mockServer(initialRoutes: MockRoutes = {}): MockServer {
  const routes: MockRoutes = { ...initialRoutes };
  const requests: MockRequest[] = [];

  const fetchMock = vi.fn(async (input: string, init: RequestInit = {}) => {
    const url = new URL(input);
    const method = (init.method ?? "GET").toUpperCase();
    if (url.pathname === "/api/auth/csrf/") {
      return Response.json({ csrfToken: "sample-csrf-token" });
    }
    const request: MockRequest = {
      method,
      path: url.pathname,
      searchParams: url.searchParams,
      body: typeof init.body === "string" ? JSON.parse(init.body) : undefined,
    };
    requests.push(request);
    const route = routes[`${method} ${url.pathname}`];
    if (!route) {
      throw new Error(`The test has no route for ${method} ${url.pathname}`);
    }
    return route(request);
  });
  vi.stubGlobal("fetch", fetchMock);

  return {
    requests,
    requestsTo: (route) =>
      requests.filter((request) => `${request.method} ${request.path}` === route),
    use: (moreRoutes) => {
      Object.assign(routes, moreRoutes);
    },
  };
}

/** A route that gives no answer at all, as when the server is stopped. */
export const noAnswer: MockRoute = () => {
  throw new TypeError("Failed to fetch");
};

/** One page of a list, in the shape that the server returns. */
export function pageOf<Row>(
  results: Row[],
  page: { count?: number; page?: number; pageSize?: number; totalPages?: number } = {},
) {
  return {
    count: page.count ?? results.length,
    page: page.page ?? 1,
    pageSize: page.pageSize ?? 20,
    totalPages: page.totalPages ?? 1,
    results,
  };
}

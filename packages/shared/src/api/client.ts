import { getClientEnv } from "../env/client-env";

/** The status of an `ApiError` when the server gave no answer at all. */
export const NETWORK_ERROR_STATUS = 0;

/**
 * The one error that `apiFetch` throws when a request fails.
 * `status` is the HTTP status of the answer, or 0 when there was no answer.
 * `body` is the JSON body of the answer, or null when it had none.
 * `detail` is the text of the field `detail` of that body, when it has one.
 * `message` is a technical text in English for logs. It is not a text for the
 * screen: a page chooses its own translated text from `status`.
 */
export class ApiError extends Error {
  public readonly detail: string | null;

  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown = null,
  ) {
    super(message);
    this.name = "ApiError";
    this.detail = readDetail(body);
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** True when the server gave no answer (no network, server stopped, CORS refusal). */
export function isNetworkError(error: unknown): boolean {
  return isApiError(error) && error.status === NETWORK_ERROR_STATUS;
}

export type ApiFetchOptions = Omit<RequestInit, "body"> & {
  /** A value to send as the JSON body. `apiFetch` sets the `Content-Type` header. */
  json?: unknown;
  /** A body that is already in its final form, for example `FormData`. */
  body?: BodyInit | null;
};

const CSRF_PATH = "/api/auth/csrf/";
const CSRF_HEADER = "X-CSRFToken";
const READ_ONLY_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function readDetail(body: unknown): string | null {
  if (body && typeof body === "object" && "detail" in body) {
    const detail = (body as { detail: unknown }).detail;
    return typeof detail === "string" ? detail : null;
  }
  return null;
}

/** The full address of a path of the server, for example `/api/health/`. */
export function apiUrl(path: string): string {
  const { NEXT_PUBLIC_API_BASE_URL } = getClientEnv();
  return `${NEXT_PUBLIC_API_BASE_URL.replace(/\/$/, "")}${path}`;
}

async function send(path: string, init: RequestInit): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }
  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      ...init,
      method,
      // Sends the session cookie and the CSRF cookie to the server.
      credentials: "include",
      headers,
    });
  } catch (error) {
    // fetch rejects with a TypeError when there is no answer. A cancelled
    // request rejects with an AbortError, which stays as it is.
    if (error instanceof TypeError) {
      throw new ApiError(
        `${method} ${path} got no answer from the server`,
        NETWORK_ERROR_STATUS,
      );
    }
    throw error;
  }

  if (!response.ok) {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    throw new ApiError(
      `${method} ${path} failed with status ${response.status}`,
      response.status,
      body,
    );
  }
  return response;
}

async function readBody<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

/** Asks the server for the CSRF token. The browser also gets the cookie `csrftoken`. */
export async function fetchCsrfToken(): Promise<string> {
  const response = await send(CSRF_PATH, {});
  const body = await readBody<{ csrfToken?: unknown }>(response);
  if (typeof body?.csrfToken !== "string" || body.csrfToken === "") {
    throw new ApiError(
      `GET ${CSRF_PATH} returned no csrfToken`,
      response.status,
      body,
    );
  }
  return body.csrfToken;
}

/**
 * Sends one request to the server and returns the JSON body of the answer.
 *
 * - The session cookie travels with every request (`credentials: "include"`).
 * - A request that changes data (every method except GET, HEAD and OPTIONS)
 *   first asks the server for the CSRF token and sends it in `X-CSRFToken`.
 *   It asks each time, because a login changes the token.
 * - An answer with an error status, and no answer at all, become one
 *   `ApiError`.
 * - An answer with status 204 returns `undefined`.
 */
export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { json, body, headers, ...rest } = options;
  const method = (rest.method ?? "GET").toUpperCase();

  const requestHeaders = new Headers(headers);
  if (json !== undefined) {
    requestHeaders.set("Content-Type", "application/json");
  }
  if (!READ_ONLY_METHODS.has(method)) {
    requestHeaders.set(CSRF_HEADER, await fetchCsrfToken());
  }

  const response = await send(path, {
    ...rest,
    method,
    headers: requestHeaders,
    body: json !== undefined ? JSON.stringify(json) : body,
  });
  return readBody<T>(response);
}

// The security headers that Next.js adds to every answer of this app.
// next.config.ts calls securityHeaders(). The same file exists in apps/web and
// in apps/internal: a next.config.ts file cannot import from packages/shared.

export type SecurityHeader = { key: string; value: string };

type SecurityHeadersOptions = {
  /** The address of the server (NEXT_PUBLIC_API_BASE_URL), or nothing. */
  apiBaseUrl: string | undefined;
  /** True for "next dev", false for a built app. */
  isDevelopment: boolean;
};

// The address that packages/shared uses when NEXT_PUBLIC_API_BASE_URL is empty.
const DEFAULT_API_BASE_URL = "http://localhost:8000";

/** The protocol, host and port of an address, or nothing when it is not an address. */
function originOf(address: string): string | undefined {
  try {
    return new URL(address).origin;
  } catch {
    return undefined;
  }
}

/**
 * The content security policy: the list of places that a page of this app may
 * load code, styles, pictures and fonts from, and may send requests to.
 *
 * - Scripts and styles: this app only. `'unsafe-inline'` stays, because
 *   Next.js writes small scripts and styles into each page. Without it the
 *   pages do not start.
 * - `'unsafe-eval'` and `ws:` only for "next dev": the reload of a changed
 *   file needs them. A built app does not get them.
 * - Requests: this app and the server (apps/api).
 * - `frame-ancestors 'none'`: no other site may show this app inside a frame.
 */
export function contentSecurityPolicy({
  apiBaseUrl,
  isDevelopment,
}: SecurityHeadersOptions): string {
  const apiOrigin = originOf(apiBaseUrl?.trim() || DEFAULT_API_BASE_URL);
  const scriptSources = ["'self'", "'unsafe-inline'"];
  const connectSources = ["'self'"];
  if (apiOrigin) {
    connectSources.push(apiOrigin);
  }
  if (isDevelopment) {
    scriptSources.push("'unsafe-eval'");
    connectSources.push("ws:");
  }
  return [
    "default-src 'self'",
    `script-src ${scriptSources.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src ${connectSources.join(" ")}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

/** The headers of every answer of this app. */
export function securityHeaders(
  options: SecurityHeadersOptions,
): SecurityHeader[] {
  return [
    // No other site may show this app inside a frame (clickjacking).
    { key: "X-Frame-Options", value: "DENY" },
    // The browser uses the content type that the app sends and does not guess.
    { key: "X-Content-Type-Options", value: "nosniff" },
    // Another site gets only the address of this site, not the page and its
    // filters, when a person follows a link to it.
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    // The pages may not use the camera, the microphone, the position, the
    // payment dialog or USB devices.
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    },
    { key: "Content-Security-Policy", value: contentSecurityPolicy(options) },
  ];
}

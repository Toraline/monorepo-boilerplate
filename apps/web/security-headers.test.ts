import { describe, expect, it } from "vitest";

import nextConfig from "./next.config";
import { contentSecurityPolicy, securityHeaders } from "./security-headers";

const builtApp = {
  apiBaseUrl: "https://api.example.com/",
  isDevelopment: false,
};

function headerValue(key: string): string | undefined {
  return securityHeaders(builtApp).find((header) => header.key === key)?.value;
}

describe("securityHeaders", () => {
  it("forbids a frame on another site, a guessed content type and the device features", () => {
    expect(headerValue("X-Frame-Options")).toBe("DENY");
    expect(headerValue("X-Content-Type-Options")).toBe("nosniff");
    expect(headerValue("Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(headerValue("Permissions-Policy")).toBe(
      "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    );
  });

  it("has a content security policy that allows this app and the server only", () => {
    expect(headerValue("Content-Security-Policy")).toBe(
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "font-src 'self' data:",
        "connect-src 'self' https://api.example.com",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
      ].join("; "),
    );
  });

  it("allows what the reload of a changed file needs only for next dev", () => {
    const developmentPolicy = contentSecurityPolicy({
      apiBaseUrl: "http://localhost:8000",
      isDevelopment: true,
    });

    expect(developmentPolicy).toContain(
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    );
    expect(developmentPolicy).toContain(
      "connect-src 'self' http://localhost:8000 ws:",
    );
    expect(contentSecurityPolicy(builtApp)).not.toContain("unsafe-eval");
    expect(contentSecurityPolicy(builtApp)).not.toContain("ws:");
  });

  it("uses the address of the server on this machine when no address is set", () => {
    expect(
      contentSecurityPolicy({ apiBaseUrl: " ", isDevelopment: false }),
    ).toContain("connect-src 'self' http://localhost:8000;");
  });

  it("names no server when the address is not an address", () => {
    expect(
      contentSecurityPolicy({ apiBaseUrl: "not an address", isDevelopment: false }),
    ).toContain("connect-src 'self';");
  });
});

describe("next.config.ts", () => {
  it("adds the security headers to every path and hides the name of the framework", async () => {
    const rules = await nextConfig.headers?.();

    expect(rules).toHaveLength(1);
    expect(rules?.[0].source).toBe("/:path*");
    expect(rules?.[0].headers.map((header) => header.key)).toEqual([
      "X-Frame-Options",
      "X-Content-Type-Options",
      "Referrer-Policy",
      "Permissions-Policy",
      "Content-Security-Policy",
    ]);
    expect(nextConfig.poweredByHeader).toBe(false);
  });
});

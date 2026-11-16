import { existsSync } from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

import { securityHeaders } from "./security-headers";

// The values of this machine are in one file: .env in the root folder of the
// repository, the same file that the server (apps/api) reads. Next.js looks for
// env files only in the folder of the app, so this file loads the root .env
// itself. A variable that the environment already has wins over the file, so a
// real server sets its variables in its own environment and has no .env file.
const repositoryRoot = path.resolve(__dirname, "../..");
const rootEnvFile = path.join(repositoryRoot, ".env");
if (existsSync(rootEnvFile)) {
  process.loadEnvFile(rootEnvFile);
}

const nextConfig: NextConfig = {
  // The answers do not say "X-Powered-By: Next.js".
  poweredByHeader: false,
  // The security headers of every answer: security-headers.ts explains each.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders({
          apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
          isDevelopment: process.env.NODE_ENV === "development",
        }),
      },
    ];
  },
  // packages/shared and packages/ui are TypeScript source with no build step:
  // Next.js compiles them.
  transpilePackages: ["@repo/shared", "@repo/ui"],
  // The packages of the npm workspace are installed in the root folder.
  turbopack: {
    root: repositoryRoot,
  },
  // The variables that the code in the browser may read. Next.js writes their
  // values into the code when it starts or builds the app.
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  },
};

// next-intl reads the language and the texts of each request from this file.
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);

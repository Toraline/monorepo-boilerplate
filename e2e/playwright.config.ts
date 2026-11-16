import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

import {
  apiPort,
  apiUrl,
  e2eDatabaseName,
  repositoryRoot,
  webPort,
  webUrl,
} from "./environment";

const isAutomaticCheck = Boolean(process.env.CI);
const apiFolder = path.join(repositoryRoot, "apps/api");
const webFolder = path.join(repositoryRoot, "apps/web");
const python = ".venv/bin/python";

// The server of the end-to-end run, in 4 steps:
// 1. delete the end-to-end database and create it again, empty;
// 2. create its tables;
// 3. create the first admin from SEED_ADMIN_* (the user of the tests);
// 4. start the server. "--noreload": one process, so Playwright can stop it.
const startServer = [
  `${python} ../../e2e/scripts/reset_database.py`,
  `${python} manage.py migrate --no-input`,
  `${python} manage.py seed_admin`,
  `${python} manage.py runserver 127.0.0.1:${apiPort} --noreload`,
].join(" && ");

// The web app the way a real server runs it: built, then started. The build
// writes the address of the end-to-end server into the code of the browser.
const startWebApp = `npx next build && npx next start --port ${webPort}`;

export default defineConfig({
  testDir: "./tests",
  // One test file at a time: the 2 tests use the same user and the same database.
  workers: 1,
  fullyParallel: false,
  // A test.only left in a file fails the automatic check.
  forbidOnly: isAutomaticCheck,
  // No second try: a test that fails once is a failure.
  retries: 0,
  timeout: 30_000,
  // "list" prints one line for each test. "html" writes the report of the run
  // into e2e/playwright-report; the automatic check keeps it when a test fails.
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: webUrl,
    // The texts of the tests are the English texts of apps/web.
    locale: "en-US",
    // What is kept for a failed test, in e2e/test-results: a recording of
    // every step (open it with "npx playwright show-trace") and a screenshot.
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Playwright starts these two programs before the tests and stops them
  // after the tests. "reuseExistingServer: false": a program that already
  // runs on the port is never used, because it could be the development
  // server with the development database. The run then stops with an error.
  webServer: [
    {
      name: "server",
      command: startServer,
      cwd: apiFolder,
      url: `http://127.0.0.1:${apiPort}/api/health/`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        POSTGRES_DB: e2eDatabaseName,
        WEB_ORIGINS: webUrl,
        PYTHONUNBUFFERED: "1",
      },
    },
    {
      name: "web",
      command: startWebApp,
      cwd: webFolder,
      url: `${webUrl}/login`,
      reuseExistingServer: false,
      timeout: 240_000,
      env: {
        NEXT_PUBLIC_API_BASE_URL: apiUrl,
        NEXT_TELEMETRY_DISABLED: "1",
      },
    },
  ],
});

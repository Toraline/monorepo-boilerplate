import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["shared/**/*.test.ts", "*-toraline-monorepo/src/**/*.test.ts"],
    // A test that creates a whole monorepo copies about 400 files and runs git.
    testTimeout: 60_000,
    hookTimeout: 60_000,
    // The tests make git commits in temporary folders. git needs a name and an
    // email for a commit; these are invented. No test uses the network.
    env: {
      GIT_AUTHOR_NAME: "Sample Person",
      GIT_AUTHOR_EMAIL: "sample.person@example.com",
      GIT_COMMITTER_NAME: "Sample Person",
      GIT_COMMITTER_EMAIL: "sample.person@example.com",
      GIT_CONFIG_GLOBAL: "/dev/null",
      GIT_CONFIG_SYSTEM: "/dev/null",
    },
  },
});

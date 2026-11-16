import { existsSync } from "node:fs";
import path from "node:path";

// The values of this machine are in one file: .env in the root folder of the
// repository, the file that the server and the web apps read. A variable that
// the environment already has wins over the file.
export const repositoryRoot = path.resolve(import.meta.dirname, "..");
const rootEnvFile = path.join(repositoryRoot, ".env");
if (existsSync(rootEnvFile)) {
  process.loadEnvFile(rootEnvFile);
}

/** The value of a variable of .env. The run stops with one clear line when it is missing. */
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `The variable ${name} is not set. Fix: run "make env" to create .env from .env.example, then run "make e2e" again.`,
    );
  }
  return value;
}

/**
 * The ports of the end-to-end run. They are not the ports of "make run"
 * (8000 and 3000), so the tests can run while you work on the apps.
 * Another port: E2E_API_PORT=8101 E2E_WEB_PORT=3101 make e2e
 */
export const apiPort = process.env.E2E_API_PORT ?? "8100";
export const webPort = process.env.E2E_WEB_PORT ?? "3100";

/** The address of the server and of the web app of the end-to-end run. */
export const apiUrl = `http://localhost:${apiPort}`;
export const webUrl = `http://localhost:${webPort}`;

/**
 * The database of the end-to-end run: the name of the development database
 * plus "_e2e", on the same PostgreSQL server. Each run deletes it and creates
 * it again. The development database is never opened.
 */
export const e2eDatabaseName = `${required("POSTGRES_DB")}_e2e`;

/**
 * The user of the tests: the first admin, which "make seed" creates from
 * these three variables. The tests have no email and no password of their own.
 */
export const seedAdmin = {
  email: required("SEED_ADMIN_EMAIL"),
  password: required("SEED_ADMIN_PASSWORD"),
  name: required("SEED_ADMIN_NAME"),
};

// Checks of scripts/worktree-setup.local.sh, the script that gives a worktree
// its own database port. Each test builds a small git repository with a main
// checkout and one worktree in a temporary folder, and runs the real script in
// the worktree. No test starts a database or uses the network.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createServer, type Server } from "node:net";
import { join } from "node:path";

import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { BOILERPLATE_ROOT, commitAll, git, newRepository, writeFiles } from "./testing";

const SCRIPT = "scripts/worktree-setup.local.sh";
const MARKER = "# The port below was chosen for this worktree by scripts/worktree-setup.local.sh:";

const openServers: Server[] = [];

/** Listens on a port of this machine, as another program would. Port 0 asks the machine for a free port. */
function listenOn(port: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      openServers.push(server);
      const address = server.address();
      resolve(typeof address === "object" && address !== null ? address.port : port);
    });
  });
}

function closeServers(): Promise<void[]> {
  return Promise.all(
    openServers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))),
  );
}

/** A port where this port and the 2 ports after it are free. The tests count up from it, as the script counts up from 5433. */
async function findThreeFreePorts(): Promise<number> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = await listenOn(0);
    try {
      await listenOn(candidate + 1);
      await listenOn(candidate + 2);
      return candidate;
    } catch {
      // One of the next 2 ports is in use: ask for another port.
    } finally {
      await closeServers();
    }
  }
  throw new Error("Found no 3 free ports in a row on this machine.");
}

interface Checkouts {
  mainCheckout: string;
  worktree: string;
}

/** A repository with the script, a main checkout with `mainPort` in its .env, and a worktree with `worktreeEnvironment` as its .env. */
function checkoutsWith(mainPort: number, worktreeEnvironment: string): Checkouts {
  const mainCheckout = newRepository("main-checkout");
  writeFiles(mainCheckout, {
    [SCRIPT]: readFileSync(join(BOILERPLATE_ROOT, SCRIPT), "utf8"),
    ".gitignore": ".env\n",
    ".env.example": "POSTGRES_DB=sample\nPOSTGRES_PORT=5432\n",
  });
  commitAll(mainCheckout, "first");
  writeFiles(mainCheckout, { ".env": `POSTGRES_DB=sample\nPOSTGRES_PORT=${mainPort}\n` });
  const worktree = join(mainCheckout, "..", "worktree");
  git(mainCheckout, "worktree", "add", "--quiet", "-b", "sample-branch", worktree);
  writeFiles(worktree, { ".env": worktreeEnvironment });
  return { mainCheckout, worktree };
}

/** Runs the script in the worktree. Returns what it printed. */
function runScript(worktree: string, firstPort: number): string {
  return execFileSync("bash", [SCRIPT], {
    cwd: worktree,
    encoding: "utf8",
    env: { ...process.env, WORKTREE_FIRST_PORT: String(firstPort), MAIN_CHECKOUT: "" },
  });
}

function environmentOf(checkout: string): string {
  return readFileSync(join(checkout, ".env"), "utf8");
}

describe("scripts/worktree-setup.local.sh: the database port of a worktree", () => {
  let firstPort: number;

  beforeAll(async () => {
    firstPort = await findThreeFreePorts();
  });

  afterEach(closeServers);

  it("main checkout on 5432: the worktree gets the first port", () => {
    const { mainCheckout, worktree } = checkoutsWith(5432, "POSTGRES_DB=sample\nPOSTGRES_PORT=5432\n");

    const output = runScript(worktree, firstPort);

    expect(environmentOf(worktree)).toBe(`POSTGRES_DB=sample\n${MARKER} ${firstPort}\nPOSTGRES_PORT=${firstPort}\n`);
    expect(output).toContain(`POSTGRES_PORT=${firstPort} (the main checkout uses 5432)`);
    expect(environmentOf(mainCheckout)).toBe("POSTGRES_DB=sample\nPOSTGRES_PORT=5432\n");
  });

  it("main checkout on another port: the worktree does not keep 5432 of .env.example, and never gets the port of the main checkout", () => {
    const { worktree } = checkoutsWith(firstPort, "POSTGRES_DB=sample\nPOSTGRES_PORT=5432\n");

    runScript(worktree, firstPort);

    expect(environmentOf(worktree)).toContain(`\nPOSTGRES_PORT=${firstPort + 1}\n`);
  });

  it("port in use by another program: the worktree gets the next port", async () => {
    const { worktree } = checkoutsWith(5432, "POSTGRES_DB=sample\nPOSTGRES_PORT=5432\n");
    await listenOn(firstPort);

    runScript(worktree, firstPort);

    expect(environmentOf(worktree)).toContain(`\nPOSTGRES_PORT=${firstPort + 1}\n`);
  });

  it("a second run keeps the port that the script gave, also while the worktree's own database listens on it", async () => {
    const { worktree } = checkoutsWith(5432, "POSTGRES_DB=sample\nPOSTGRES_PORT=5432\n");
    runScript(worktree, firstPort);
    const afterFirstRun = environmentOf(worktree);
    await listenOn(firstPort);

    const output = runScript(worktree, firstPort);

    expect(environmentOf(worktree)).toBe(afterFirstRun);
    expect(output).toContain(`this worktree keeps its own port, ${firstPort}`);
  });

  it("replaces a port that the script did not choose, and writes the comment line only once", () => {
    const { worktree } = checkoutsWith(
      5432,
      `${MARKER} ${firstPort + 2}\nPOSTGRES_PORT=${firstPort + 1}\nPOSTGRES_DB=sample\n`,
    );

    runScript(worktree, firstPort);

    expect(environmentOf(worktree)).toBe(`${MARKER} ${firstPort}\nPOSTGRES_PORT=${firstPort}\nPOSTGRES_DB=sample\n`);
  });

  it("adds the line POSTGRES_PORT when .env has none", () => {
    const { worktree } = checkoutsWith(5432, "POSTGRES_DB=sample\n");

    runScript(worktree, firstPort);

    expect(environmentOf(worktree)).toBe(`POSTGRES_DB=sample\n${MARKER} ${firstPort}\nPOSTGRES_PORT=${firstPort}\n`);
  });
});

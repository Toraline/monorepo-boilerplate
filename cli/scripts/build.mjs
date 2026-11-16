// Builds the two commands: one file per package, dist/index.js, with the code
// of cli/shared inside it. A package has no dependency at run time.
// It also copies the file LICENSE of the repository root into each package, so
// that the packed package holds the license. git ignores the copies.
import { chmodSync, copyFileSync, existsSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";

const cliDirectory = join(dirname(fileURLToPath(import.meta.url)), "..");

for (const packageName of ["create-toraline-monorepo", "update-toraline-monorepo"]) {
  const packageDirectory = join(cliDirectory, packageName);
  // A package that is not written yet has no folder.
  if (!existsSync(join(packageDirectory, "package.json"))) {
    continue;
  }
  const { version } = JSON.parse(readFileSync(join(packageDirectory, "package.json"), "utf8"));
  const outputFile = join(packageDirectory, "dist", "index.js");
  rmSync(join(packageDirectory, "dist"), { recursive: true, force: true });
  await build({
    entryPoints: [join(packageDirectory, "src", "index.ts")],
    outfile: outputFile,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node24",
    banner: { js: "#!/usr/bin/env node" },
    define: { PACKAGE_VERSION: JSON.stringify(version) },
    legalComments: "none",
  });
  chmodSync(outputFile, 0o755);
  copyFileSync(join(cliDirectory, "..", "LICENSE"), join(packageDirectory, "LICENSE"));
  console.log(`Built ${packageName} ${version}: ${packageName}/dist/index.js`);
}

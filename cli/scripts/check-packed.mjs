// Checks what each of the two packages would hold on npm. It packs nothing for
// real: "npm pack --dry-run" only lists the files. It stops with an error when
// a package holds a file that is not expected (a file of the template, an env
// file), when the license file is missing or differs from the file LICENSE of
// the repository root, or when a packed file holds a personal path or an email
// address.
// Run it after the build: "make build-cli" does both.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const cliDirectory = join(dirname(fileURLToPath(import.meta.url)), "..");
const packageNames = ["create-toraline-monorepo", "update-toraline-monorepo"];

// The only files that a package may hold.
const allowedFiles = ["LICENSE", "README.md", "dist/index.js", "package.json"];
// The license of the repository. The build copies it into each package.
const repositoryLicense = readFileSync(join(cliDirectory, "..", "LICENSE"), "utf8");

// A path of one person's machine: the home folder of macOS, Linux or Windows.
const personalPath = /\/Users\/|\/home\/[a-z]|[A-Z]:\\Users\\/;
const emailAddress = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z0-9.-]+/g;
// Invented addresses, and the SSH address of GitHub, which has the form of an email.
const allowedEmails = /@example\.com$|^git@github\.com$/;

const problems = [];
for (const packageName of packageNames) {
  const packageDirectory = join(cliDirectory, packageName);
  // A package that is not written yet has no folder.
  if (!existsSync(join(packageDirectory, "package.json"))) {
    continue;
  }
  const output = execFileSync("npm", ["pack", "--dry-run", "--json"], { cwd: packageDirectory, encoding: "utf8" });
  const [packed] = JSON.parse(output);
  const files = packed.files.map((file) => file.path).sort();
  console.log(`${packed.name}@${packed.version}: ${files.length} files, ${packed.unpackedSize} bytes unpacked`);
  for (const file of files) {
    console.log(`  ${file}`);
  }
  for (const file of allowedFiles) {
    if (!files.includes(file)) {
      problems.push(`${packageName}: the file ${file} is missing. Run the build first: make build-cli`);
    }
  }
  for (const file of files) {
    if (!allowedFiles.includes(file)) {
      problems.push(`${packageName}: the file ${file} must not be in the package. Allowed: ${allowedFiles.join(", ")}.`);
      continue;
    }
    const text = readFileSync(join(packageDirectory, file), "utf8");
    if (personalPath.test(text)) {
      problems.push(`${packageName}: ${file} holds a path of one person's machine.`);
    }
    for (const email of text.match(emailAddress) ?? []) {
      if (!allowedEmails.test(email)) {
        problems.push(`${packageName}: ${file} holds the email address ${email}. Use an address on example.com.`);
      }
    }
  }
  const manifest = JSON.parse(readFileSync(join(packageDirectory, "package.json"), "utf8"));
  if (manifest.license !== "MIT") {
    problems.push(`${packageName}: "license" in package.json must be "MIT", the license of the repository.`);
  }
  const licenseFile = join(packageDirectory, "LICENSE");
  if (existsSync(licenseFile) && readFileSync(licenseFile, "utf8") !== repositoryLicense) {
    problems.push(`${packageName}: the file LICENSE differs from the file LICENSE of the repository root. Run: make build-cli`);
  }
  if (manifest.author !== "Toraline") {
    problems.push(`${packageName}: "author" in package.json must be "Toraline", the organization.`);
  }
  if (manifest.dependencies && Object.keys(manifest.dependencies).length > 0) {
    problems.push(`${packageName}: the package must have no dependency at run time; its code is one built file.`);
  }
}

if (problems.length > 0) {
  for (const problem of problems) {
    console.error(`Problem: ${problem}`);
  }
  process.exit(1);
}
console.log("Packed files: OK.");

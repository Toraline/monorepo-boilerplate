import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

import { CommandError } from "../../shared/src/errors";
import { profileValue } from "../../shared/src/profile";
import { readRecord, RECORD_FILE_NAME, todayAsText } from "../../shared/src/record";
import {
  BOILERPLATE_ROOT,
  filesUnder,
  git,
  newRepository,
  commitAll,
  temporaryFolder,
  templateRepositoryOfThisCheckout,
  writeFiles,
} from "../../shared/src/testing";
import { createMonorepo, nextSteps } from "./create";
import { type CreateManifest, MANIFEST_FILE } from "./manifest";
import type { CreateOptions } from "./options";

const version = readFileSync(join(BOILERPLATE_ROOT, "boilerplate", "VERSION"), "utf8").trim();
const manifest = JSON.parse(readFileSync(join(BOILERPLATE_ROOT, MANIFEST_FILE), "utf8")) as CreateManifest;

let templateRepository: string;

beforeAll(() => {
  templateRepository = templateRepositoryOfThisCheckout();
});

function optionsFor(directory: string, changes: Partial<CreateOptions> = {}): CreateOptions {
  return {
    directory,
    name: "sample-shop",
    ticketPrefix: "SHP",
    databaseName: "sample_shop",
    keepSample: true,
    owner: "sample-owner",
    databasePort: undefined,
    source: templateRepository,
    reference: undefined,
    ...changes,
  };
}

const ignoreLine = () => {};

function textOf(directory: string, relativePath: string): string {
  return readFileSync(join(directory, relativePath), "utf8");
}

/**
 * The imports of the TypeScript files that name a file which does not exist.
 * "@/x" is "src/x" of the app or package that holds the file.
 */
function brokenImports(directory: string): string[] {
  const broken: string[] = [];
  const endings = ["", ".ts", ".tsx", ".json", ".css", "/index.ts", "/index.tsx"];
  for (const file of filesUnder(directory)) {
    if (!/^(apps|packages|e2e)\/.*\.(ts|tsx)$/.test(file)) {
      continue;
    }
    const sourceRoot = file.includes("/src/") ? `${file.split("/src/")[0]}/src` : null;
    for (const match of textOf(directory, file).matchAll(/from "(\.{1,2}\/[^"]+|@\/[^"]+)"/g)) {
      const imported = match[1] ?? "";
      const base = imported.startsWith("@/")
        ? join(directory, sourceRoot ?? "", imported.slice(2))
        : join(directory, dirname(file), imported);
      if (!endings.some((ending) => existsSync(`${base}${ending}`))) {
        broken.push(`${file} imports ${imported}`);
      }
    }
  }
  return broken;
}

/** The links of the documents (README.md, AGENTS.md, docs/) that name a file which does not exist. */
function brokenLinks(directory: string): string[] {
  const broken: string[] = [];
  for (const file of filesUnder(directory)) {
    if (!/^(README\.md|AGENTS\.md|docs\/.*\.md)$/.test(file)) {
      continue;
    }
    for (const match of textOf(directory, file).matchAll(/\]\(([^)#\s]+)(#[^)]*)?\)/g)) {
      const target = match[1] ?? "";
      if (!/^[a-z]+:/.test(target) && !existsSync(join(directory, dirname(file), target))) {
        broken.push(`${file} links to ${target}`);
      }
    }
  }
  return broken;
}

describe("createMonorepo, from this checkout as the boilerplate", () => {
  it("creates a monorepo that keeps the sample product", () => {
    const directory = join(temporaryFolder("create"), "sample-shop");

    const result = createMonorepo(optionsFor(directory, { databasePort: "5544" }), ignoreLine);

    expect(result).toMatchObject({ directory, version, reference: `v${version}`, sampleRemoved: false });

    // A new history with one commit, and nothing left to commit.
    expect(git(directory, "log", "--format=%s").trim()).toBe(`chore: start from the boilerplate ${version}`);
    expect(git(directory, "status", "--porcelain")).toBe("");
    expect(git(directory, "branch", "--show-current").trim()).toBe("main");

    // The name of the project, in every place that the guide lists.
    expect(JSON.parse(textOf(directory, "package.json")).name).toBe("sample-shop");
    expect(JSON.parse(textOf(directory, "package-lock.json")).name).toBe("sample-shop");
    expect(JSON.parse(textOf(directory, "package-lock.json")).packages[""].name).toBe("sample-shop");
    expect(textOf(directory, "Makefile").split("\n")[0]).toBe("# sample-shop: run every command from the repository root.");
    expect(textOf(directory, "AGENTS.md").split("\n")[0]).toBe("# sample-shop: instructions for agents");
    expect(textOf(directory, "README.md").split("\n")[0]).toBe("# sample-shop");
    for (const file of ["README.md", "docs/setup-guide.md"]) {
      expect(textOf(directory, file), file).toContain(
        "git clone git@github.com:sample-owner/sample-shop.git\n",
      );
      expect(textOf(directory, file), file).toContain("cd sample-shop\n");
    }
    // The lines that name the place where a project gets newer skills from stay.
    expect(textOf(directory, "scripts/sync-skills.sh")).toContain("monorepo-boilerplate");

    // The database name, the same in the 3 files.
    expect(textOf(directory, ".env.example")).toContain("POSTGRES_USER=sample_shop\nPOSTGRES_PASSWORD");
    expect(textOf(directory, ".env.example")).toContain("POSTGRES_DB=sample_shop\n");
    expect(textOf(directory, "docker-compose.yml")).toContain("${POSTGRES_DB:-sample_shop}");
    expect(textOf(directory, ".github/workflows/check.yml")).toContain("pg_isready -U sample_shop -d sample_shop");
    expect(textOf(directory, ".github/workflows/check.yml")).not.toContain(": todo");

    // The titles of the web apps, and the test that names one.
    expect(JSON.parse(textOf(directory, "apps/web/src/i18n/messages/en.json")).metadata.title).toBe("sample-shop");
    expect(JSON.parse(textOf(directory, "apps/internal/src/i18n/messages/pt-BR.json")).home.title).toBe(
      "Administração de sample-shop",
    );
    expect(textOf(directory, "apps/internal/src/app/(admin)/page.test.tsx")).toContain('name: "sample-shop admin"');

    // The project profile.
    expect(profileValue(textOf(directory, "AGENTS.md"), "ticket_prefix")).toBe("SHP");

    // .env: created from .env.example, with the port of the flag, and not committed.
    expect(textOf(directory, ".env")).toBe(
      textOf(directory, ".env.example").replace("POSTGRES_PORT=5432", "POSTGRES_PORT=5544"),
    );
    expect(git(directory, "ls-files", ".env")).toBe("");

    // The record file.
    expect(readRecord(directory)).toEqual({
      boilerplate: "Toraline/monorepo-boilerplate",
      createdFromVersion: version,
      createdOn: todayAsText(),
      appliedUpdates: [`${version}-first-release`],
    });
    expect(git(directory, "ls-files", RECORD_FILE_NAME).trim()).toBe(RECORD_FILE_NAME);

    // What belongs only to the boilerplate itself is not there.
    expect(existsSync(join(directory, "cli"))).toBe(false);
    expect(existsSync(join(directory, "boilerplate"))).toBe(false);
    expect(textOf(directory, "Makefile")).not.toContain("cli");

    for (const removed of manifest.boilerplateOnly.delete ?? []) {
      expect(existsSync(join(directory, removed)), removed).toBe(false);
    }
    expect(brokenLinks(directory)).toEqual([]);

    // The sample product is there.
    expect(existsSync(join(directory, "apps/api/apps/todos/models.py"))).toBe(true);
    expect(brokenImports(directory)).toEqual([]);
  });

  it("creates a monorepo with no sample product, where no file names a deleted file", () => {
    const directory = join(temporaryFolder("create"), "sample-shop");

    const result = createMonorepo(optionsFor(directory, { keepSample: false }), ignoreLine);

    expect(result.sampleRemoved).toBe(true);
    for (const deleted of manifest.sampleProduct.delete ?? []) {
      expect(existsSync(join(directory, deleted)), deleted).toBe(false);
    }
    expect(brokenImports(directory)).toEqual([]);

    // No code of the server, no command and no setting names the sample product.
    const pythonFiles = filesUnder(directory).filter((file) => /^apps\/api\/.*\.py$/.test(file));
    for (const file of pythonFiles) {
      expect(textOf(directory, file), file).not.toMatch(/apps\.todos|todos_urls|SEED_SAMPLE/);
    }
    for (const file of ["Makefile", ".env.example", ".env"]) {
      expect(textOf(directory, file), file).not.toMatch(/seed-sample|seed_sample|SEED_SAMPLE/);
    }
    expect(textOf(directory, "packages/ui/src/components/index.ts")).not.toContain("TagBadge");
    expect(textOf(directory, "AGENTS.md")).not.toContain("module-model.md");

    // The start page, the menu and the texts that replace the todo list.
    expect(textOf(directory, "apps/web/src/app/(app)/page.tsx")).toContain('useTranslations("home")');
    const webMessages = JSON.parse(textOf(directory, "apps/web/src/i18n/messages/en.json"));
    expect(webMessages.todos).toBeUndefined();
    expect(webMessages.home.title).toBe("Start page");
    const internalMessages = JSON.parse(textOf(directory, "apps/internal/src/i18n/messages/pt-BR.json"));
    expect(Object.keys(internalMessages)).not.toContain("history");
    expect(internalMessages.menu).toEqual({ label: "Áreas", home: "Início" });
    expect(textOf(directory, "apps/internal/src/features/auth/components/admin-menu.tsx")).toContain(
      'const AREAS = [{ id: "home", path: "/" }] as const;',
    );
    // Both languages of an app have the same keys.
    for (const app of ["web", "internal"]) {
      const keysOf = (language: string) =>
        JSON.stringify(
          JSON.parse(textOf(directory, `apps/${app}/src/i18n/messages/${language}.json`)),
          (_key, value: unknown) => (typeof value === "string" ? "" : value),
        );
      expect(keysOf("en"), app).toBe(keysOf("pt-BR"));
    }

    expect(git(directory, "log", "--format=%s").trim().split("\n")).toHaveLength(1);
    expect(git(directory, "status", "--porcelain")).toBe("");
    expect(nextSteps(optionsFor(directory, { keepSample: false }), result, false).join("\n")).toContain(
      "The documents still describe it",
    );
  });

  it("names the file of each overlay as it is today (a changed file makes the overlay stale)", () => {
    for (const overlay of manifest.sampleProduct.overlays ?? []) {
      const today = createHash("sha256").update(readFileSync(join(BOILERPLATE_ROOT, overlay.file))).digest("hex");

      expect(
        today,
        `${overlay.file} changed. Check that ${overlay.from} still replaces it correctly, then write the new SHA-256 into ${MANIFEST_FILE}.`,
      ).toBe(overlay.originalSha256);
      expect(existsSync(join(BOILERPLATE_ROOT, overlay.from)), overlay.from).toBe(true);
    }
  });

  it("uses the tag or the branch of --ref", () => {
    const directory = join(temporaryFolder("create"), "from-main");

    const result = createMonorepo(optionsFor(directory, { reference: "main" }), ignoreLine);

    expect(result.reference).toBe("main");
    expect(readRecord(directory)?.createdFromVersion).toBe(version);
  });
});

describe("createMonorepo: the refusals", () => {
  it("refuses a folder that is not empty, and changes nothing in it", () => {
    const directory = temporaryFolder("create");
    writeFiles(directory, { "notes.txt": "mine" });

    expect(() => createMonorepo(optionsFor(directory), ignoreLine)).toThrow(
      `The folder ${directory} is not empty. Nothing was changed.`,
    );
    expect(readdirSync(directory)).toEqual(["notes.txt"]);
  });

  it("accepts a folder that exists and is empty", () => {
    const directory = temporaryFolder("create");

    createMonorepo(optionsFor(directory), ignoreLine);

    expect(existsSync(join(directory, "Makefile"))).toBe(true);
  });

  it("refuses a folder whose parent folder does not exist, and creates nothing", () => {
    const parent = join(temporaryFolder("create"), "missing");

    expect(() => createMonorepo(optionsFor(join(parent, "sample-shop")), ignoreLine)).toThrow("does not exist");
    expect(existsSync(parent)).toBe(false);
  });

  it("writes nothing outside the new folder", () => {
    const parent = temporaryFolder("create");
    writeFiles(parent, { "other/file.txt": "other" });

    createMonorepo(optionsFor(join(parent, "sample-shop")), ignoreLine);

    expect(readdirSync(parent).sort()).toEqual(["other", "sample-shop"]);
    expect(filesUnder(join(parent, "other"))).toEqual(["file.txt"]);
    // The place the boilerplate came from did not change.
    expect(git(templateRepository, "status", "--porcelain")).toBe("");
  });

  it("says why the download failed and what to do, and leaves no folder", () => {
    const parent = temporaryFolder("create");
    const directory = join(parent, "sample-shop");
    const missingSource = join(parent, "no-such-boilerplate");

    const failure = (() => {
      try {
        createMonorepo(optionsFor(directory, { source: missingSource }), ignoreLine);
      } catch (error) {
        return error;
      }
    })() as CommandError;

    expect(failure).toBeInstanceOf(CommandError);
    expect(failure.message).toContain("The boilerplate could not be read.");
    expect(failure.message).toContain(missingSource);
    expect(failure.whatToDo).toContain("gh auth login");
    expect(failure.whatToDo).toContain("--source");
    expect(readdirSync(parent)).toEqual([]);
  });

  it("says what to do when the tag of --ref does not exist, and leaves no folder", () => {
    const parent = temporaryFolder("create");

    expect(() =>
      createMonorepo(optionsFor(join(parent, "sample-shop"), { reference: "v9.9.9" }), ignoreLine),
    ).toThrow('The boilerplate could not be downloaded at "v9.9.9"');
    expect(readdirSync(parent)).toEqual([]);
  });

  it("says what to do when the boilerplate has no release tag", () => {
    const source = newRepository("no-tag");
    writeFiles(source, { "README.md": "x" });
    commitAll(source, "first");

    expect(() =>
      createMonorepo(optionsFor(join(temporaryFolder("create"), "sample-shop"), { source }), ignoreLine),
    ).toThrow("has no release tag");
  });

  it("stops when the copy is older than the first release (no version file)", () => {
    const source = newRepository("old");
    writeFiles(source, { "README.md": "x" });
    commitAll(source, "first", "0.0.1");

    expect(() =>
      createMonorepo(optionsFor(join(temporaryFolder("create"), "sample-shop"), { source }), ignoreLine),
    ).toThrow("has no file boilerplate/VERSION");
  });
});

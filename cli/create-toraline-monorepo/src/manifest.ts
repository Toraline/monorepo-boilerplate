import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";

import { pathInside } from "../../shared/src/paths";

/** The file of the boilerplate that says what the create command changes in a copy. */
export const MANIFEST_FILE = "boilerplate/create-manifest.json";

/** The number that the command understands in "manifestVersion". */
export const MANIFEST_VERSION = 1;

/** Replaces a text in a file. The file must hold the text exactly `count` times. */
export interface TextReplacement {
  file: string;
  find: string;
  replace: string;
  count: number;
}

/** Changes a JSON file: removes keys, then sets values. A key is a path with dots, for example "menu.home". */
export interface JsonChange {
  file: string;
  remove?: string[];
  set?: Record<string, unknown>;
}

/** Replaces the whole content of a file with the content of another file of the boilerplate. */
export interface Overlay {
  file: string;
  from: string;
  /**
   * The SHA-256 of the file that is replaced, at the time the overlay was written. A test compares it,
   * so a change of the file asks for the same change in the overlay. Left out when the overlay does not
   * follow the content of the file (docs/decisions.md, which gets a new entry with each ticket).
   */
  originalSha256?: string;
}

/** One group of changes. They run in this order: overlays, delete, replace, json. */
export interface ManifestSection {
  overlays?: Overlay[];
  delete?: string[];
  replace?: TextReplacement[];
  json?: JsonChange[];
}

export interface CreateManifest {
  manifestVersion: number;
  /** Removes what belongs only to the boilerplate itself. */
  boilerplateOnly: ManifestSection;
  /** Writes the values of the new project: its name, its ticket prefix, its database name. */
  project: ManifestSection;
  /** Removes the sample todo product, from the code and from the documents. Runs only when the person chose to remove it. */
  sampleProduct: ManifestSection;
}

/** The values of the new project. A text of the manifest names one as {{name}}. */
export type ManifestValues = Record<"name" | "owner" | "databaseName" | "ticketPrefix", string>;

/** A change of the manifest that does not fit the files of the copy. */
export class ManifestError extends Error {}

function withValues(text: string, values: ManifestValues): string {
  return text.replace(/\{\{(\w+)\}\}/g, (placeholder, key: string) =>
    key in values ? values[key as keyof ManifestValues] : placeholder,
  );
}

function valueWithValues(value: unknown, values: ManifestValues): unknown {
  if (typeof value === "string") {
    return withValues(value, values);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => valueWithValues(entry, values));
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, valueWithValues(entry, values)]),
    );
  }
  return value;
}

function countOf(text: string, search: string): number {
  return text.split(search).length - 1;
}

function applyReplacement(rootDirectory: string, change: TextReplacement, values: ManifestValues): void {
  const filePath = pathInside(rootDirectory, change.file);
  if (!existsSync(filePath)) {
    throw new ManifestError(`${change.file} does not exist.`);
  }
  const text = readFileSync(filePath, "utf8");
  const found = countOf(text, change.find);
  if (found !== change.count) {
    throw new ManifestError(
      `${change.file} holds the text ${JSON.stringify(change.find)} ${found} times; the manifest expects ${change.count}.`,
    );
  }
  writeFileSync(filePath, text.replaceAll(change.find, () => withValues(change.replace, values)));
}

type JsonObject = Record<string, unknown>;

/** The object that holds the last key of a path with dots, and that last key. */
function parentOfKey(root: JsonObject, keyPath: string, file: string): [JsonObject, string] {
  const keys = keyPath.split(".");
  const lastKey = keys.pop() ?? "";
  let current = root;
  for (const key of keys) {
    const next = current[key];
    if (next === null || typeof next !== "object" || Array.isArray(next)) {
      throw new ManifestError(`${file} has no group "${key}" (for the key "${keyPath}").`);
    }
    current = next as JsonObject;
  }
  return [current, lastKey];
}

function applyJsonChange(rootDirectory: string, change: JsonChange, values: ManifestValues): void {
  const filePath = pathInside(rootDirectory, change.file);
  if (!existsSync(filePath)) {
    throw new ManifestError(`${change.file} does not exist.`);
  }
  const content = JSON.parse(readFileSync(filePath, "utf8")) as JsonObject;
  for (const keyPath of change.remove ?? []) {
    const [parent, lastKey] = parentOfKey(content, keyPath, change.file);
    if (!(lastKey in parent)) {
      throw new ManifestError(`${change.file} has no key "${keyPath}" to remove.`);
    }
    delete parent[lastKey];
  }
  for (const [keyPath, value] of Object.entries(change.set ?? {})) {
    const [parent, lastKey] = parentOfKey(content, keyPath, change.file);
    parent[lastKey] = valueWithValues(value, values);
  }
  writeFileSync(filePath, `${JSON.stringify(content, null, 2)}\n`);
}

/** Applies one group of changes of the manifest to the copy in `rootDirectory`. */
export function applySection(
  rootDirectory: string,
  section: ManifestSection,
  values: ManifestValues,
): void {
  for (const overlay of section.overlays ?? []) {
    const source = pathInside(rootDirectory, overlay.from);
    const destination = pathInside(rootDirectory, overlay.file);
    if (!existsSync(source) || !existsSync(destination)) {
      throw new ManifestError(`The overlay of ${overlay.file} needs ${overlay.from} and ${overlay.file}; one does not exist.`);
    }
    cpSync(source, destination);
  }
  for (const relativePath of section.delete ?? []) {
    const fullPath = pathInside(rootDirectory, relativePath);
    if (!existsSync(fullPath)) {
      throw new ManifestError(`${relativePath} does not exist, so it cannot be deleted.`);
    }
    rmSync(fullPath, { recursive: true });
  }
  for (const change of section.replace ?? []) {
    applyReplacement(rootDirectory, change, values);
  }
  for (const change of section.json ?? []) {
    applyJsonChange(rootDirectory, change, values);
  }
}

/** Reads the manifest of a copy of the boilerplate. */
export function readManifest(rootDirectory: string): CreateManifest {
  const filePath = pathInside(rootDirectory, MANIFEST_FILE);
  if (!existsSync(filePath)) {
    throw new ManifestError(`${MANIFEST_FILE} does not exist.`);
  }
  return JSON.parse(readFileSync(filePath, "utf8")) as CreateManifest;
}

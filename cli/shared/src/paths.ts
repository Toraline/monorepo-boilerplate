import { isAbsolute, relative, resolve } from "node:path";

/**
 * The full path of a file inside a folder. Throws when the path would leave
 * the folder: no command writes or deletes outside the folder it works in.
 */
export function pathInside(rootDirectory: string, relativePath: string): string {
  const fullPath = resolve(rootDirectory, relativePath);
  const fromRoot = relative(resolve(rootDirectory), fullPath);
  if (fromRoot === "" || fromRoot.startsWith("..") || isAbsolute(fromRoot)) {
    throw new Error(`The path "${relativePath}" is not inside ${rootDirectory}. Nothing was changed there.`);
  }
  return fullPath;
}

/** A version of the boilerplate: three numbers, for example "0.1.0". */
const VERSION_PATTERN = /^(\d+)\.(\d+)\.(\d+)$/;

export function isVersion(text: string): boolean {
  return VERSION_PATTERN.test(text);
}

function versionNumbers(version: string): [number, number, number] {
  const match = VERSION_PATTERN.exec(version);
  if (!match) {
    throw new Error(`"${version}" is not a version. A version has three numbers, for example 0.1.0.`);
  }
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/** Negative when `first` is older than `second`, 0 when they are the same, positive when it is newer. */
export function compareVersions(first: string, second: string): number {
  const firstNumbers = versionNumbers(first);
  const secondNumbers = versionNumbers(second);
  for (let position = 0; position < 3; position += 1) {
    const difference = (firstNumbers[position] ?? 0) - (secondNumbers[position] ?? 0);
    if (difference !== 0) {
      return difference;
    }
  }
  return 0;
}

/** The versions from the oldest to the newest. */
export function sortVersions(versions: string[]): string[] {
  return [...versions].sort(compareVersions);
}

/** The git tag of a release: "v" and the version. */
export function releaseTag(version: string): string {
  return `v${version}`;
}

/** The version of a release tag, or null when the tag is not a release tag. "v0.1.0" gives "0.1.0". */
export function versionOfTag(tag: string): string | null {
  const version = tag.startsWith("v") ? tag.slice(1) : "";
  return isVersion(version) ? version : null;
}

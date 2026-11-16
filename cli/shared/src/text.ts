/** A number with its noun in the right form: "1 update", "2 updates". */
export function countOf(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

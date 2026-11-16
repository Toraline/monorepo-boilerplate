/** The number of the page in the address: a whole number from 1 up, else 1. */
export function readPage(value: string | null): number {
  const page = Number(value);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

/** The id of a row in the address: a whole number from 1 up, else `null`. */
export function readId(value: string | null): number | null {
  const id = Number(value);
  return value !== null && Number.isInteger(id) && id >= 1 ? id : null;
}

/** One of the allowed words in the address, else `null`. */
export function readChoice<Choice extends string>(
  value: string | null,
  choices: readonly Choice[],
): Choice | null {
  return choices.find((choice) => choice === value) ?? null;
}

import { z } from "zod";

/**
 * The Zod schema of one page of a list, in the shape that every list request
 * of the server returns. `rowSchema` is the schema of one row.
 */
export function pagedSchema<Row extends z.ZodType>(rowSchema: Row) {
  return z.object({
    count: z.number(),
    page: z.number(),
    pageSize: z.number(),
    totalPages: z.number(),
    results: z.array(rowSchema),
  });
}

/** One page of a list of `Row`. */
export type Paged<Row> = {
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
  results: Row[];
};

/**
 * The values after `?` of a list request. A value that is `undefined`, `null`
 * or empty is left out. Returns `""` or a text that starts with `?`.
 */
export function listQuery(
  values: Record<string, string | number | boolean | null | undefined>,
): string {
  const searchParams = new URLSearchParams();
  for (const [name, value] of Object.entries(values)) {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(name, String(value));
    }
  }
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

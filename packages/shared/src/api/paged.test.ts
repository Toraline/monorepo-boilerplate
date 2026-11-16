import { describe, expect, it } from "vitest";
import { z } from "zod";

import { listQuery, pagedSchema } from "./paged";

describe("pagedSchema", () => {
  const schema = pagedSchema(z.object({ id: z.number() }));

  it("accepts one page of rows", () => {
    const page = {
      count: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
      results: [{ id: 7 }],
    };

    expect(schema.parse(page)).toEqual(page);
  });

  it("refuses a row of another form", () => {
    expect(() =>
      schema.parse({
        count: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
        results: [{ id: "seven" }],
      }),
    ).toThrow();
  });
});

describe("listQuery", () => {
  it("writes the values that are set", () => {
    expect(listQuery({ completed: false, tag: 2, page: 1 })).toBe(
      "?completed=false&tag=2&page=1",
    );
  });

  it("leaves out the values that are not set", () => {
    expect(listQuery({ completed: undefined, tag: null, owner: "" })).toBe("");
  });
});

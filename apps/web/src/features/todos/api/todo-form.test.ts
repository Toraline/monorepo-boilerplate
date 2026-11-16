import { describe, expect, it } from "vitest";

import { validateTodoForm } from "./todo-form";

describe("validateTodoForm", () => {
  it("accepts a title with no description, and removes the spaces around the values", () => {
    expect(validateTodoForm({ title: "  Buy milk ", description: " " })).toEqual({
      valid: true,
      values: { title: "Buy milk", description: "" },
    });
  });

  it.each(["", "   "])("refuses the empty title '%s'", (title) => {
    expect(validateTodoForm({ title, description: "" })).toEqual({
      valid: false,
      errors: { title: "titleRequired" },
    });
  });

  it("refuses a title with more than 200 characters", () => {
    expect(
      validateTodoForm({ title: "a".repeat(201), description: "" }),
    ).toEqual({ valid: false, errors: { title: "titleTooLong" } });
  });

  it("refuses a description with more than 2000 characters", () => {
    expect(
      validateTodoForm({ title: "Buy milk", description: "a".repeat(2001) }),
    ).toEqual({ valid: false, errors: { description: "descriptionTooLong" } });
  });
});

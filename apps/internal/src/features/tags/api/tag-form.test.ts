import { describe, expect, it } from "vitest";

import { validateTagForm } from "./tag-form";

describe("validateTagForm", () => {
  it("accepts a name and a color, removes the spaces and writes the color in upper case", () => {
    expect(validateTagForm({ name: "  Work ", color: "#1565c0" })).toEqual({
      valid: true,
      input: { name: "Work", color: "#1565C0" },
    });
  });

  it.each(["", "   "])("refuses the empty name '%s'", (name) => {
    expect(validateTagForm({ name, color: "#1565C0" })).toEqual({
      valid: false,
      errors: { name: "nameRequired" },
    });
  });

  it("refuses a name with more than 50 characters", () => {
    expect(validateTagForm({ name: "a".repeat(51), color: "#1565C0" })).toEqual({
      valid: false,
      errors: { name: "nameTooLong" },
    });
  });

  it.each(["", "blue", "#12345", "#1234567", "1565C0", "#GGGGGG"])(
    "refuses the color '%s'",
    (color) => {
      expect(validateTagForm({ name: "Work", color })).toEqual({
        valid: false,
        errors: { color: "colorInvalid" },
      });
    },
  );

  it("names both fields when both are wrong", () => {
    expect(validateTagForm({ name: "", color: "blue" })).toEqual({
      valid: false,
      errors: { name: "nameRequired", color: "colorInvalid" },
    });
  });
});

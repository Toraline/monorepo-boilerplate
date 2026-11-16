import { describe, expect, it } from "vitest";

import { ApiError } from "./client";
import { hasFieldError } from "./field-errors";

describe("hasFieldError", () => {
  it("is true when a 400 answer names the field", () => {
    const error = new ApiError("failed", 400, { name: ["Already exists."] });

    expect(hasFieldError(error, "name")).toBe(true);
    expect(hasFieldError(error, "color")).toBe(false);
  });

  it("is false for another status, for no body and for another error", () => {
    expect(hasFieldError(new ApiError("failed", 500, { name: [] }), "name")).toBe(
      false,
    );
    expect(hasFieldError(new ApiError("failed", 400), "name")).toBe(false);
    expect(hasFieldError(new Error("failed"), "name")).toBe(false);
  });
});

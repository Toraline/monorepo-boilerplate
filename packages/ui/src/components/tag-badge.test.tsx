import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TagBadge } from "./tag-badge";

describe("TagBadge", () => {
  it("shows the name of the tag as text", () => {
    render(<TagBadge name="Work" color="#1565C0" />);

    expect(screen.getByText("Work")).toBeInTheDocument();
  });

  it("shows the color as a dot that a screen reader skips", () => {
    const { container } = render(<TagBadge name="Work" color="#1565C0" />);

    const dot = container.querySelector('[data-slot="tag-color"]');
    expect(dot).toHaveStyle({ backgroundColor: "#1565C0" });
    expect(dot).toHaveAttribute("aria-hidden", "true");
  });
});

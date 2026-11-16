import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithMessages } from "@/test/render";

import HomePage from "./page";

describe("HomePage", () => {
  it("shows the title of the start page", () => {
    renderWithMessages(<HomePage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Start page" }),
    ).toBeInTheDocument();
  });
});

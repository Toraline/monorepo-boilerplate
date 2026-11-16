import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import HomePage from "./page";

vi.mock("@/features/todos", () => ({
  TodoList: () => <div data-testid="todo-list" />,
}));

describe("HomePage", () => {
  it("shows the todo list", () => {
    render(<HomePage />);

    expect(screen.getByTestId("todo-list")).toBeInTheDocument();
  });
});

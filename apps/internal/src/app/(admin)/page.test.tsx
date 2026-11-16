import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithMessages } from "@/test/render";

import HomePage from "./page";

describe("HomePage", () => {
  it("shows the name of the app", () => {
    renderWithMessages(<HomePage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Todo list admin" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Choose an area in the menu: tags, todos or history."),
    ).toBeInTheDocument();
  });

  it("shows the Portuguese texts on a Portuguese page", () => {
    renderWithMessages(<HomePage />, "pt-BR");

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Administração da lista de tarefas",
      }),
    ).toBeInTheDocument();
  });
});

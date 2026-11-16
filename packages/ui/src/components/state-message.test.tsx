import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StateMessage } from "./state-message";

describe("StateMessage", () => {
  it("is a status while the answer is loading", () => {
    render(<StateMessage kind="loading">Loading the todos.</StateMessage>);

    expect(screen.getByRole("status")).toHaveTextContent("Loading the todos.");
  });

  it("is an alert when the request failed, and shows its action", () => {
    render(
      <StateMessage kind="error" action={<button type="button">Try again</button>}>
        The server did not answer.
      </StateMessage>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "The server did not answer.",
    );
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("is plain text when the list is empty", () => {
    render(<StateMessage kind="empty">You have no todos yet.</StateMessage>);

    expect(screen.getByText("You have no todos yet.")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

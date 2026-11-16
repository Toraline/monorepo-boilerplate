import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Pagination } from "./pagination";

function renderPagination(page: number, totalPages: number) {
  const onPageChange = vi.fn();
  render(
    <Pagination
      page={page}
      totalPages={totalPages}
      onPageChange={onPageChange}
      labels={{
        navigation: "Pages of the list",
        previous: "Previous page",
        next: "Next page",
        status: `Page ${page} of ${totalPages}`,
      }}
    />,
  );
  return { onPageChange };
}

describe("Pagination", () => {
  it("shows nothing when the list has one page", () => {
    renderPagination(1, 1);

    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("shows the number of the page, and asks for the page after and the page before", () => {
    const { onPageChange } = renderPagination(2, 3);

    expect(
      screen.getByRole("navigation", { name: "Pages of the list" }),
    ).toHaveTextContent("Page 2 of 3");

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(onPageChange).toHaveBeenLastCalledWith(3);

    fireEvent.click(screen.getByRole("button", { name: "Previous page" }));
    expect(onPageChange).toHaveBeenLastCalledWith(1);
  });

  it("turns the button for the page before off on the first page", () => {
    renderPagination(1, 3);

    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next page" })).toBeEnabled();
  });

  it("turns the button for the page after off on the last page", () => {
    renderPagination(3, 3);

    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  });
});

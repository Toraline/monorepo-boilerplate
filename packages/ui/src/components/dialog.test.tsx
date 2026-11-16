import { fireEvent, render, screen } from "@testing-library/react";
import { useRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { Dialog } from "./dialog";

function Page({ removeOpener = false }: { removeOpener?: boolean }) {
  const [open, setOpen] = useState(false);
  const [openerExists, setOpenerExists] = useState(true);
  const fallback = useRef<HTMLButtonElement>(null);

  return (
    <div>
      <button type="button" ref={fallback}>
        New
      </button>
      {openerExists ? (
        <button type="button" onClick={() => setOpen(true)}>
          Open
        </button>
      ) : null}
      <Dialog
        open={open}
        title="Delete this todo?"
        onClose={() => setOpen(false)}
        fallbackFocus={fallback}
      >
        <button type="button" onClick={() => setOpen(false)}>
          Cancel
        </button>
        <button
          type="button"
          onClick={() => {
            setOpenerExists(!removeOpener);
            setOpen(false);
          }}
        >
          Delete
        </button>
      </Dialog>
    </div>
  );
}

function openDialog() {
  const opener = screen.getByRole("button", { name: "Open" });
  opener.focus();
  fireEvent.click(opener);
  return opener;
}

describe("Dialog", () => {
  it("shows nothing while it is closed", () => {
    render(<Page />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("is a modal dialog with its title as its name", () => {
    render(<Page />);
    openDialog();

    const dialog = screen.getByRole("dialog", { name: "Delete this todo?" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("moves the focus to its first control on opening", () => {
    render(<Page />);
    openDialog();

    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
  });

  it("keeps the Tab key inside the dialog", () => {
    render(<Page />);
    openDialog();
    const cancel = screen.getByRole("button", { name: "Cancel" });
    const deleteButton = screen.getByRole("button", { name: "Delete" });

    deleteButton.focus();
    fireEvent.keyDown(deleteButton, { key: "Tab" });
    expect(cancel).toHaveFocus();

    fireEvent.keyDown(cancel, { key: "Tab", shiftKey: true });
    expect(deleteButton).toHaveFocus();
  });

  it("closes on the Escape key and returns the focus to the control that opened it", () => {
    render(<Page />);
    const opener = openDialog();

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it("closes on a press outside the dialog, and not on a press inside it", () => {
    const onClose = vi.fn();
    render(
      <Dialog open title="A title" onClose={onClose}>
        <p>Content</p>
      </Dialog>,
    );

    fireEvent.mouseDown(screen.getByText("Content"));
    expect(onClose).not.toHaveBeenCalled();

    const backdrop = screen.getByRole("dialog").parentElement as HTMLElement;
    fireEvent.mouseDown(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("moves the focus to the fallback when the control that opened it is gone", () => {
    render(<Page removeOpener />);
    openDialog();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(screen.getByRole("button", { name: "New" })).toHaveFocus();
  });

  it("takes the focus itself when it has no control", () => {
    render(
      <Dialog open title="A title" onClose={() => {}}>
        <p>Content</p>
      </Dialog>,
    );

    expect(screen.getByRole("dialog")).toHaveFocus();
  });
});

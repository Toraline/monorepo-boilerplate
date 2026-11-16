"use client";

import {
  useEffect,
  useId,
  useRef,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from "react";

export type DialogProps = {
  /** true shows the dialog. false shows nothing. */
  open: boolean;
  /** The title at the top. A screen reader says it as the name of the dialog. */
  title: string;
  /** Called when the person closes the dialog: the Escape key, or a press outside it. */
  onClose: () => void;
  /** The content: a text, a form, the buttons. */
  children: ReactNode;
  /**
   * Where the focus goes after the dialog closes, when the control that
   * opened it is no longer on the page, for example the button of a deleted row.
   */
  fallbackFocus?: RefObject<HTMLElement | null>;
};

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * A dialog on top of the page, for a form or a confirmation.
 *
 * - Focus: on opening, the focus moves to the first control of the dialog.
 *   The Tab key stays inside the dialog. On closing, the focus returns to the
 *   control that opened it.
 * - Keyboard: the Escape key closes it.
 * - Screen reader: `role="dialog"`, `aria-modal`, and the title as its name.
 *
 * This package holds no text: the app gives the title and the content.
 */
export function Dialog({ open, ...openDialogProps }: DialogProps) {
  return open ? <OpenDialog {...openDialogProps} /> : null;
}

function OpenDialog({
  title,
  onClose,
  children,
  fallbackFocus,
}: Omit<DialogProps, "open">) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const openedFrom = document.activeElement;
    const fallbackTarget = fallbackFocus?.current;
    const firstControl = panel.current?.querySelector<HTMLElement>(FOCUSABLE);
    (firstControl ?? panel.current)?.focus();

    return () => {
      const openerIsOnThePage =
        openedFrom instanceof HTMLElement && openedFrom.isConnected;
      const focusTarget = openerIsOnThePage ? openedFrom : fallbackTarget;
      focusTarget?.focus();
    };
  }, [fallbackFocus]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== "Tab" || !panel.current) {
      return;
    }
    const controls = Array.from(
      panel.current.querySelectorAll<HTMLElement>(FOCUSABLE),
    );
    const firstControl = controls[0];
    const lastControl = controls[controls.length - 1];
    if (!firstControl || !lastControl) {
      event.preventDefault();
      return;
    }
    const focused = document.activeElement;
    if (event.shiftKey && (focused === firstControl || focused === panel.current)) {
      event.preventDefault();
      lastControl.focus();
    } else if (!event.shiftKey && focused === lastControl) {
      event.preventDefault();
      firstControl.focus();
    }
  }

  function handleBackdropMouseDown(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  return (
    <div
      data-slot="backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
      onMouseDown={handleBackdropMouseDown}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="flex max-h-full w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-lg border border-default bg-surface p-6 text-primary shadow-xl"
      >
        <h2 id={titleId} className="heading-section m-0">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}

import type { ReactNode } from "react";

export type StateMessageKind = "loading" | "empty" | "error";

export type StateMessageProps = {
  /**
   * What the message says. "loading": the answer is not there yet. "empty":
   * the answer has no rows. "error": the request failed.
   */
  kind: StateMessageKind;
  /** The text of the message. */
  children: ReactNode;
  /** A control under the text, for example a button that sends the request again. */
  action?: ReactNode;
};

// The classes of the tokens of the theme, so the box follows both themes.
const STYLES: Record<StateMessageKind, string> = {
  loading: "border-default bg-surface text-secondary",
  empty: "border-default bg-surface text-secondary",
  error: "border-error bg-error text-error",
};

/**
 * A box that says the state of a list or a page: loading, empty or failed.
 * A screen reader reads "loading" when it has time (`role="status"`) and
 * "error" at once (`role="alert"`). This package holds no text: the app gives
 * the text, translated.
 */
export function StateMessage({ kind, children, action }: StateMessageProps) {
  const roles: Record<StateMessageKind, "status" | "alert" | undefined> = {
    loading: "status",
    empty: undefined,
    error: "alert",
  };

  return (
    <div
      role={roles[kind]}
      data-state={kind}
      className={`flex flex-col items-start gap-3 rounded-md border p-4 ${STYLES[kind]}`}
    >
      <p className="m-0">{children}</p>
      {action}
    </div>
  );
}

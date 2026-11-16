import type { ReactNode } from "react";

/** Shows several examples of a component next to each other, with the same space between them. */
export function Row({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-4">{children}</div>;
}

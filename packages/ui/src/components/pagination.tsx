"use client";

import { Button } from "@toraline.tech/ui";

export type PaginationLabels = {
  /** The name of the group for a screen reader, for example "Pages of the list". */
  navigation: string;
  /** The text of the button for the page before. */
  previous: string;
  /** The text of the button for the page after. */
  next: string;
  /** The text between the buttons, already filled, for example "Page 2 of 3". */
  status: string;
};

export type PaginationProps = {
  /** The number of the page that is shown. The first page is 1. */
  page: number;
  /** How many pages the list has. */
  totalPages: number;
  /** Called with the number of the page that the person asked for. */
  onPageChange: (page: number) => void;
  labels: PaginationLabels;
};

/**
 * The two buttons that move between the pages of a list, with the number of
 * the page between them. It shows nothing when the list has one page. This
 * package holds no text: the app gives the texts.
 */
export function Pagination({
  page,
  totalPages,
  onPageChange,
  labels,
}: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav
      aria-label={labels.navigation}
      className="flex flex-wrap items-center gap-3"
    >
      <Button
        variant="secondary"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        {labels.previous}
      </Button>
      <span aria-live="polite" className="text-sm text-secondary">
        {labels.status}
      </span>
      <Button
        variant="secondary"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        {labels.next}
      </Button>
    </nav>
  );
}

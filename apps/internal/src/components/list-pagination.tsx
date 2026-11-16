"use client";

import { useTranslations } from "next-intl";

import { Pagination } from "@repo/ui/components";

type ListPaginationProps = {
  /** The number of the page that is shown. */
  page: number;
  /** How many pages the list has. */
  totalPages: number;
  /** Called with the number of the page that the admin asked for. */
  onPageChange: (page: number) => void;
};

/** The page buttons of a list of this app, with their texts. */
export function ListPagination({
  page,
  totalPages,
  onPageChange,
}: ListPaginationProps) {
  const t = useTranslations("pagination");

  return (
    <Pagination
      page={page}
      totalPages={totalPages}
      onPageChange={onPageChange}
      labels={{
        navigation: t("label"),
        previous: t("previous"),
        next: t("next"),
        status: t("status", { page, totalPages }),
      }}
    />
  );
}

"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { isApiError } from "@repo/shared/api";
import {
  readChoice,
  readId,
  readPage,
  useAddressValues,
} from "@repo/shared/navigation";
import { SelectField, StateMessage } from "@repo/ui/components";
import { Button } from "@toraline.tech/ui";

import { ListPagination } from "@/components/list-pagination";
import { userLabel, useUsers } from "@/features/users";
import { useDateTimeFormat } from "@/lib/format/use-date-time-format";

import { HISTORY_KINDS } from "../api/history";
import { useHistory } from "../hooks/use-history";

const HEADER_CELL = "border-b border-default p-3 text-left text-sm font-medium text-strong";
const CELL = "border-b border-default p-3 align-top";

/**
 * The page of the history: every change of a todo of any user, newest first,
 * in pages, with a filter by user and by kind of change. The filters and the
 * page number are kept in the address of the page. The history is read-only.
 */
export function HistoryList() {
  const t = useTranslations("history");
  const formatDateTime = useDateTimeFormat();
  const { searchParams, setValues } = useAddressValues();

  const userId = readId(searchParams.get("user"));
  const kind = readChoice(searchParams.get("kind"), HISTORY_KINDS);
  const page = readPage(searchParams.get("page"));
  const hasFilter = userId !== null || kind !== null;

  const history = useHistory({ userId, kind, page });
  const users = useUsers();

  // A page that no longer exists: show the first page.
  const pageIsGone =
    page > 1 && isApiError(history.error) && history.error.status === 404;
  useEffect(() => {
    if (pageIsGone) {
      setValues({ page: null });
    }
  });

  /** Sets one filter in the address and goes back to the first page. */
  function setFilter(name: string, value: string) {
    setValues({ [name]: value, page: null });
  }

  function renderEntries() {
    if (history.isPending || pageIsGone) {
      return <StateMessage kind="loading">{t("loading")}</StateMessage>;
    }
    if (history.isError) {
      return (
        <StateMessage
          kind="error"
          action={
            <Button
              variant="secondary"
              loading={history.isFetching}
              onClick={() => history.refetch()}
            >
              {t("tryAgain")}
            </Button>
          }
        >
          {t("failed")}
        </StateMessage>
      );
    }
    if (history.data.results.length === 0) {
      return (
        <StateMessage kind="empty">
          {hasFilter ? t("emptyFilter") : t("empty")}
        </StateMessage>
      );
    }
    return (
      <div className="flex flex-col gap-4">
        <p className="m-0 text-sm text-secondary">
          {t("count", { count: history.data.count })}
        </p>
        <div className="overflow-x-auto rounded-md border border-default bg-surface">
          <table className="w-full border-collapse">
            <caption className="sr-only">{t("table.caption")}</caption>
            <thead>
              <tr>
                <th scope="col" className={HEADER_CELL}>
                  {t("table.date")}
                </th>
                <th scope="col" className={HEADER_CELL}>
                  {t("table.user")}
                </th>
                <th scope="col" className={HEADER_CELL}>
                  {t("table.kind")}
                </th>
                <th scope="col" className={HEADER_CELL}>
                  {t("table.todo")}
                </th>
              </tr>
            </thead>
            <tbody>
              {history.data.results.map((entry) => (
                <tr key={entry.id} data-kind={entry.kind}>
                  <td className={`${CELL} whitespace-nowrap`}>
                    <time dateTime={entry.createdAt}>
                      {formatDateTime(entry.createdAt)}
                    </time>
                  </td>
                  <td className={CELL}>
                    <span className="block">{entry.user.name}</span>
                    <span className="block text-sm text-secondary">
                      {entry.user.email}
                    </span>
                  </td>
                  <td className={CELL}>{t(`kinds.${entry.kind}`)}</td>
                  <td className={`${CELL} max-w-xs break-words`}>
                    {entry.todoTitle}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ListPagination
          page={history.data.page}
          totalPages={history.data.totalPages}
          onPageChange={(nextPage) => setValues({ page: String(nextPage) })}
        />
      </div>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-8">
      <h1 className="heading-page m-0 text-brand">{t("title")}</h1>
      <form
        role="search"
        aria-label={t("filters.label")}
        onSubmit={(event) => event.preventDefault()}
        className="grid gap-4 sm:grid-cols-2"
      >
        <SelectField
          label={t("filters.user")}
          value={userId === null ? "" : String(userId)}
          onChange={(event) => setFilter("user", event.target.value)}
          options={[
            { value: "", label: t("filters.allUsers") },
            ...(users.data ?? []).map((user) => ({
              value: String(user.id),
              label: userLabel(user),
            })),
          ]}
        />
        <SelectField
          label={t("filters.kind")}
          value={kind ?? ""}
          onChange={(event) => setFilter("kind", event.target.value)}
          options={[
            { value: "", label: t("filters.allKinds") },
            ...HISTORY_KINDS.map((historyKind) => ({
              value: historyKind,
              label: t(`kinds.${historyKind}`),
            })),
          ]}
        />
      </form>
      {renderEntries()}
    </main>
  );
}

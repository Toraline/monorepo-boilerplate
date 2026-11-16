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
import { SelectField, StateMessage, TagBadge } from "@repo/ui/components";
import { Button } from "@toraline.tech/ui";

import { ListPagination } from "@/components/list-pagination";
import { useTags } from "@/features/tags";
import { userLabel, useUsers } from "@/features/users";
import { useDateTimeFormat } from "@/lib/format/use-date-time-format";

import { useAdminTodos } from "../hooks/use-admin-todos";

const HEADER_CELL = "border-b border-default p-3 text-left text-sm font-medium text-strong";
const CELL = "border-b border-default p-3 align-top";

/**
 * The page of the todos of all users: a read-only table in pages, with a
 * filter by owner, by tag and by completed. The filters and the page number
 * are kept in the address of the page. The table has no control that changes
 * a todo.
 */
export function TodoTable() {
  const t = useTranslations("todos");
  const formatDateTime = useDateTimeFormat();
  const { searchParams, setValues } = useAddressValues();

  const ownerId = readId(searchParams.get("owner"));
  const tagId = readId(searchParams.get("tag"));
  const completedValue = readChoice(searchParams.get("completed"), [
    "true",
    "false",
  ]);
  const page = readPage(searchParams.get("page"));
  const completed = completedValue === null ? null : completedValue === "true";
  const hasFilter =
    ownerId !== null || tagId !== null || completedValue !== null;

  const todos = useAdminTodos({ ownerId, tagId, completed, page });
  const users = useUsers();
  const tags = useTags();

  // A page that no longer exists, for example after a filter made the list
  // shorter in another tab: show the first page.
  const pageIsGone =
    page > 1 && isApiError(todos.error) && todos.error.status === 404;
  useEffect(() => {
    if (pageIsGone) {
      setValues({ page: null });
    }
  });

  /** Sets one filter in the address and goes back to the first page. */
  function setFilter(name: string, value: string) {
    setValues({ [name]: value, page: null });
  }

  function renderTable() {
    if (todos.isPending || pageIsGone) {
      return <StateMessage kind="loading">{t("loading")}</StateMessage>;
    }
    if (todos.isError) {
      return (
        <StateMessage
          kind="error"
          action={
            <Button
              variant="secondary"
              loading={todos.isFetching}
              onClick={() => todos.refetch()}
            >
              {t("tryAgain")}
            </Button>
          }
        >
          {t("failed")}
        </StateMessage>
      );
    }
    if (todos.data.results.length === 0) {
      return (
        <StateMessage kind="empty">
          {hasFilter ? t("emptyFilter") : t("empty")}
        </StateMessage>
      );
    }
    return (
      <div className="flex flex-col gap-4">
        <p className="m-0 text-sm text-secondary">
          {t("count", { count: todos.data.count })}
        </p>
        <div className="overflow-x-auto rounded-md border border-default bg-surface">
          <table className="w-full border-collapse">
            <caption className="sr-only">{t("table.caption")}</caption>
            <thead>
              <tr>
                <th scope="col" className={HEADER_CELL}>
                  {t("table.title")}
                </th>
                <th scope="col" className={HEADER_CELL}>
                  {t("table.owner")}
                </th>
                <th scope="col" className={HEADER_CELL}>
                  {t("table.tags")}
                </th>
                <th scope="col" className={HEADER_CELL}>
                  {t("table.completed")}
                </th>
                <th scope="col" className={HEADER_CELL}>
                  {t("table.updatedAt")}
                </th>
              </tr>
            </thead>
            <tbody>
              {todos.data.results.map((todo) => (
                <tr key={todo.id}>
                  <th
                    scope="row"
                    className={`${CELL} max-w-xs text-left font-medium break-words`}
                  >
                    {todo.title}
                  </th>
                  <td className={CELL}>
                    <span className="block">{todo.owner.name}</span>
                    <span className="block text-sm text-secondary">
                      {todo.owner.email}
                    </span>
                  </td>
                  <td className={CELL}>
                    {todo.tags.length > 0 ? (
                      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                        {todo.tags.map((tag) => (
                          <li key={tag.id} className="flex min-w-0">
                            <TagBadge name={tag.name} color={tag.color} />
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-secondary">{t("noTags")}</span>
                    )}
                  </td>
                  <td className={CELL}>
                    {todo.completed ? t("completed") : t("notCompleted")}
                  </td>
                  <td className={`${CELL} whitespace-nowrap`}>
                    <time dateTime={todo.updatedAt}>
                      {formatDateTime(todo.updatedAt)}
                    </time>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ListPagination
          page={todos.data.page}
          totalPages={todos.data.totalPages}
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
        className="grid gap-4 sm:grid-cols-3"
      >
        <SelectField
          label={t("filters.owner")}
          value={ownerId === null ? "" : String(ownerId)}
          onChange={(event) => setFilter("owner", event.target.value)}
          options={[
            { value: "", label: t("filters.allOwners") },
            ...(users.data ?? []).map((user) => ({
              value: String(user.id),
              label: userLabel(user),
            })),
          ]}
        />
        <SelectField
          label={t("filters.tag")}
          value={tagId === null ? "" : String(tagId)}
          onChange={(event) => setFilter("tag", event.target.value)}
          options={[
            { value: "", label: t("filters.allTags") },
            ...(tags.data ?? []).map((tag) => ({
              value: String(tag.id),
              label: tag.name,
            })),
          ]}
        />
        <SelectField
          label={t("filters.completed")}
          value={completedValue ?? ""}
          onChange={(event) => setFilter("completed", event.target.value)}
          options={[
            { value: "", label: t("filters.allStates") },
            { value: "false", label: t("notCompleted") },
            { value: "true", label: t("completed") },
          ]}
        />
      </form>
      {renderTable()}
    </main>
  );
}

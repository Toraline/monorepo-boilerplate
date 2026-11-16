"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { isApiError } from "@repo/shared/api";
import {
  readChoice,
  readId,
  readPage,
  useAddressValues,
} from "@repo/shared/navigation";
import { Pagination, SelectField, StateMessage } from "@repo/ui/components";
import { Button, Tabs } from "@toraline.tech/ui";

import { useTags } from "@/features/tags";

import type { Todo } from "../api/todos";
import { useTodos } from "../hooks/use-todos";
import { DeleteTodoDialog } from "./delete-todo-dialog";
import { TodoFormDialog } from "./todo-form-dialog";
import { TodoRow } from "./todo-row";

// The three choices of the completed filter. The value in the address is the
// value that the server expects: no value, "false" or "true".
const COMPLETED_FILTERS = [
  { id: "all", addressValue: null },
  { id: "open", addressValue: "false" },
  { id: "completed", addressValue: "true" },
] as const;

type FormTarget = { todo: Todo | null };

/**
 * The page of the todos of the user: the list with its completed filter and
 * its tag filter, and the dialogs that create, edit and delete a todo. The filters and the page
 * number are kept in the address of the page.
 */
export function TodoList() {
  const t = useTranslations("todos");
  const { searchParams, setValues } = useAddressValues();
  const [formTarget, setFormTarget] = useState<FormTarget | null>(null);
  const [todoToDelete, setTodoToDelete] = useState<Todo | null>(null);
  const newTodoButton = useRef<HTMLButtonElement>(null);

  const completedValue = readChoice(searchParams.get("completed"), [
    "true",
    "false",
  ]);
  const tagId = readId(searchParams.get("tag"));
  const page = readPage(searchParams.get("page"));
  const selectedFilter =
    COMPLETED_FILTERS.find((filter) => filter.addressValue === completedValue) ??
    COMPLETED_FILTERS[0];
  const completed = completedValue === null ? null : completedValue === "true";
  const hasFilter = completedValue !== null || tagId !== null;

  const todos = useTodos({ completed, tagId, page });
  const tags = useTags();
  const tagOptions = [
    { value: "", label: t("tagFilter.all") },
    ...(tags.data ?? []).map((tag) => ({
      value: String(tag.id),
      label: tag.name,
    })),
  ];

  // A page that no longer exists, for example after the last todo of the last
  // page was deleted: show the first page.
  const pageIsGone =
    page > 1 && isApiError(todos.error) && todos.error.status === 404;
  useEffect(() => {
    if (pageIsGone) {
      setValues({ page: null });
    }
  });

  function selectFilter(filterId: string) {
    const filter = COMPLETED_FILTERS.find(
      (candidate) => candidate.id === filterId,
    );
    setValues({ completed: filter?.addressValue ?? null, page: null });
  }

  function renderList() {
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
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {todos.data.results.map((todo) => (
            <TodoRow
              key={todo.id}
              todo={todo}
              onEdit={(todoToEdit) => setFormTarget({ todo: todoToEdit })}
              onDelete={setTodoToDelete}
            />
          ))}
        </ul>
        <Pagination
          page={todos.data.page}
          totalPages={todos.data.totalPages}
          onPageChange={(nextPage) => setValues({ page: String(nextPage) })}
          labels={{
            navigation: t("pagination.label"),
            previous: t("pagination.previous"),
            next: t("pagination.next"),
            status: t("pagination.status", {
              page: todos.data.page,
              totalPages: todos.data.totalPages,
            }),
          }}
        />
      </div>
    );
  }

  const list = renderList();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="heading-page m-0 text-brand">{t("title")}</h1>
        <Button ref={newTodoButton} onClick={() => setFormTarget({ todo: null })}>
          {t("new")}
        </Button>
      </div>
      <SelectField
        label={t("tagFilter.label")}
        options={tagOptions}
        value={tagId === null ? "" : String(tagId)}
        onChange={(event) => setValues({ tag: event.target.value, page: null })}
        className="max-w-xs"
      />
      <Tabs
        aria-label={t("filter.label")}
        value={selectedFilter.id}
        onChange={selectFilter}
        tabs={COMPLETED_FILTERS.map((filter) => ({
          id: filter.id,
          label: t(`filter.${filter.id}`),
          content: list,
        }))}
      />
      {formTarget ? (
        <TodoFormDialog
          todo={formTarget.todo}
          onClose={() => setFormTarget(null)}
          fallbackFocus={newTodoButton}
        />
      ) : null}
      {todoToDelete ? (
        <DeleteTodoDialog
          todo={todoToDelete}
          onClose={() => setTodoToDelete(null)}
          fallbackFocus={newTodoButton}
        />
      ) : null}
    </main>
  );
}

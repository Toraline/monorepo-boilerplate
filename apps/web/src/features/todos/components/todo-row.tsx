"use client";

import { useTranslations } from "next-intl";

import { TagBadge } from "@repo/ui/components";
import { Button } from "@toraline.tech/ui";

import type { Todo } from "../api/todos";
import { useSetTodoCompleted } from "../hooks/use-todos";

type TodoRowProps = {
  todo: Todo;
  /** Called when the person asks to edit the todo. */
  onEdit: (todo: Todo) => void;
  /** Called when the person asks to delete the todo. */
  onDelete: (todo: Todo) => void;
};

/**
 * One todo of the list: its title, its description, its tags (each with its
 * color and its name), and its three buttons.
 * One press of the first button completes the todo or reopens it. The name
 * of each button, for a screen reader, ends with the title of the todo.
 */
export function TodoRow({ todo, onEdit, onDelete }: TodoRowProps) {
  const t = useTranslations("todos");
  const completedRequest = useSetTodoCompleted();
  const titleStyle = todo.completed
    ? "text-secondary line-through"
    : "text-primary";

  return (
    <li
      data-completed={todo.completed}
      className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-default bg-surface p-4"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className={`m-0 font-medium break-words ${titleStyle}`}>
          {todo.title}
        </p>
        {todo.completed ? (
          <p className="m-0 text-sm font-medium text-success">
            {t("completedBadge")}
          </p>
        ) : null}
        {todo.description ? (
          <p className="m-0 text-sm break-words whitespace-pre-line text-body">
            {todo.description}
          </p>
        ) : null}
        {todo.tags.length > 0 ? (
          <ul
            aria-label={t("tagsOf", { title: todo.title })}
            className="m-0 mt-1 flex list-none flex-wrap gap-2 p-0"
          >
            {todo.tags.map((tag) => (
              <li key={tag.id} className="flex min-w-0">
                <TagBadge name={tag.name} color={tag.color} />
              </li>
            ))}
          </ul>
        ) : null}
        {completedRequest.isError ? (
          <p role="alert" className="m-0 text-sm text-danger">
            {t("actionFailed")}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          loading={completedRequest.isPending}
          aria-label={
            todo.completed
              ? t("actions.reopenName", { title: todo.title })
              : t("actions.completeName", { title: todo.title })
          }
          onClick={() =>
            completedRequest.mutate({
              todoId: todo.id,
              completed: !todo.completed,
            })
          }
        >
          {todo.completed ? t("actions.reopen") : t("actions.complete")}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          aria-label={t("actions.editName", { title: todo.title })}
          onClick={() => onEdit(todo)}
        >
          {t("actions.edit")}
        </Button>
        <Button
          variant="danger"
          size="sm"
          aria-label={t("actions.deleteName", { title: todo.title })}
          onClick={() => onDelete(todo)}
        >
          {t("actions.delete")}
        </Button>
      </div>
    </li>
  );
}

"use client";

import { useTranslations } from "next-intl";
import type { RefObject } from "react";

import { Dialog } from "@repo/ui/components";
import { Button } from "@toraline.tech/ui";

import type { Todo } from "../api/todos";
import { useDeleteTodo } from "../hooks/use-todos";

type DeleteTodoDialogProps = {
  /** The todo that the person asked to delete. */
  todo: Todo;
  /** Called when the dialog closes: after the delete, and on cancel. */
  onClose: () => void;
  /** Where the focus goes after the delete: the button of the row is gone. */
  fallbackFocus?: RefObject<HTMLElement | null>;
};

/**
 * Asks for a confirmation before a todo is deleted. The focus starts on
 * "Cancel", so the Enter key alone deletes nothing.
 */
export function DeleteTodoDialog({
  todo,
  onClose,
  fallbackFocus,
}: DeleteTodoDialogProps) {
  const t = useTranslations("todos.delete");
  const deleteRequest = useDeleteTodo();

  return (
    <Dialog
      open
      title={t("title")}
      onClose={onClose}
      fallbackFocus={fallbackFocus}
    >
      <p className="m-0 text-body">{t("message", { title: todo.title })}</p>
      {deleteRequest.isError ? (
        <p
          role="alert"
          className="m-0 rounded-md border border-error bg-error p-3 text-error"
        >
          {t("failed")}
        </p>
      ) : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          {t("cancel")}
        </Button>
        <Button
          variant="danger"
          loading={deleteRequest.isPending}
          onClick={() => deleteRequest.mutate(todo.id, { onSuccess: onClose })}
        >
          {t("confirm")}
        </Button>
      </div>
    </Dialog>
  );
}

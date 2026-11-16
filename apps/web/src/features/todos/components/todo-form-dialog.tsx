"use client";

import { useTranslations } from "next-intl";
import { useRef, useState, type FormEvent, type RefObject } from "react";

import { hasFieldError } from "@repo/shared/api";
import { Dialog } from "@repo/ui/components";
import { Button, Field, TextInput } from "@toraline.tech/ui";

import { TextAreaField } from "@/components/text-area-field";

import { validateTodoForm, type TodoFormErrors } from "../api/todo-form";
import type { Todo } from "../api/todos";
import { useCreateTodo, useUpdateTodo } from "../hooks/use-todos";
import { TagChoices } from "./tag-choices";

type TodoFormDialogProps = {
  /** The todo to edit. `null` creates a new todo. */
  todo: Todo | null;
  /** Called when the dialog closes: after a save, and on cancel. */
  onClose: () => void;
  /** Where the focus goes when the control that opened the dialog is gone. */
  fallbackFocus?: RefObject<HTMLElement | null>;
};

/**
 * The form of a todo, in a dialog: a title, an optional description and zero or more
 * tags. An empty title shows a message on the field and sends nothing.
 */
export function TodoFormDialog({
  todo,
  onClose,
  fallbackFocus,
}: TodoFormDialogProps) {
  const t = useTranslations("todos.form");
  const [title, setTitle] = useState(todo?.title ?? "");
  const [description, setDescription] = useState(todo?.description ?? "");
  const [tagIds, setTagIds] = useState(
    () => todo?.tags.map((tag) => tag.id) ?? [],
  );
  const [errors, setErrors] = useState<TodoFormErrors>({});
  const titleField = useRef<HTMLInputElement>(null);
  const createRequest = useCreateTodo();
  const updateRequest = useUpdateTodo();
  const saveRequest = todo ? updateRequest : createRequest;

  const titleRefused = hasFieldError(saveRequest.error, "title");
  const titleErrorKey = titleRefused ? "titleRefused" : errors.title;
  const saveFailed = saveRequest.isError && !titleRefused;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateTodoForm({ title, description });
    if (!result.valid) {
      setErrors(result.errors);
      if (result.errors.title) {
        titleField.current?.focus();
      }
      return;
    }
    setErrors({});
    const input = { ...result.values, tagIds };
    const saveOptions = { onSuccess: onClose };
    if (todo) {
      updateRequest.mutate({ todoId: todo.id, input }, saveOptions);
    } else {
      createRequest.mutate(input, saveOptions);
    }
  }

  return (
    <Dialog
      open
      title={todo ? t("editTitle") : t("createTitle")}
      onClose={onClose}
      fallbackFocus={fallbackFocus}
    >
      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        {saveFailed ? (
          <p
            role="alert"
            className="m-0 rounded-md border border-error bg-error p-3 text-error"
          >
            {t("failed")}
          </p>
        ) : null}
        <Field
          label={t("titleLabel")}
          error={titleErrorKey ? t(titleErrorKey) : undefined}
        >
          <TextInput
            ref={titleField}
            name="title"
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </Field>
        <TextAreaField
          label={t("descriptionLabel")}
          name="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          error={errors.description ? t(errors.description) : undefined}
        />
        <TagChoices selectedTagIds={tagIds} onChange={setTagIds} />
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button type="submit" loading={saveRequest.isPending}>
            {t("save")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

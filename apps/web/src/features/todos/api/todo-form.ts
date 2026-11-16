import { z } from "zod";

import type { TodoInput } from "./todos";

/** The keys of the texts, in the group `todos.form`, that a field can show. */
export type TodoFormErrorKey =
  | "titleRequired"
  | "titleTooLong"
  | "descriptionTooLong"
  | "titleRefused";

export type TodoFormErrors = {
  title?: TodoFormErrorKey;
  description?: TodoFormErrorKey;
};

// The limits of the server (apps/api/README.md). Spaces around a value are
// removed, as the server does.
const todoFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "titleRequired" satisfies TodoFormErrorKey)
    .max(200, "titleTooLong" satisfies TodoFormErrorKey),
  description: z
    .string()
    .trim()
    .max(2000, "descriptionTooLong" satisfies TodoFormErrorKey),
});

/** What a person typed into the two text fields of the form. */
export type TodoFormValues = Pick<TodoInput, "title" | "description">;

export type TodoFormResult =
  | { valid: true; values: TodoFormValues }
  | { valid: false; errors: TodoFormErrors };

/** Checks what a person typed into the form of a todo, before it is sent. */
export function validateTodoForm(values: TodoFormValues): TodoFormResult {
  const result = todoFormSchema.safeParse(values);
  if (result.success) {
    return { valid: true, values: result.data };
  }
  const errors: TodoFormErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if ((field === "title" || field === "description") && !errors[field]) {
      errors[field] = issue.message as TodoFormErrorKey;
    }
  }
  return { valid: false, errors };
}

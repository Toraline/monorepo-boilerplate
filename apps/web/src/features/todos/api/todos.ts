import { z } from "zod";

import { apiFetch, listQuery, pagedSchema, type Paged } from "@repo/shared/api";

import { tagSchema } from "@/features/tags";

export const todoSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string(),
  completed: z.boolean(),
  tags: z.array(tagSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Todo = z.infer<typeof todoSchema>;

const todoPageSchema = pagedSchema(todoSchema);

export type TodoFilters = {
  /** `true`: only completed. `false`: only not completed. `null`: all. */
  completed: boolean | null;
  /** The id of one tag: only the todos that have it. `null`: all. */
  tagId: number | null;
  /** The number of the page. The first page is 1. */
  page: number;
};

/** What the form of a todo sends. */
export type TodoInput = {
  title: string;
  description: string;
  /** The ids of the tags of the todo. They replace the tags it had. */
  tagIds: number[];
};

/** One page of the todos of the user who is logged in: `GET /api/todos/`. */
export async function fetchTodos(filters: TodoFilters): Promise<Paged<Todo>> {
  const query = listQuery({
    completed: filters.completed,
    tag: filters.tagId,
    page: filters.page,
  });
  const data = await apiFetch<unknown>(`/api/todos/${query}`);
  return todoPageSchema.parse(data);
}

/** Creates a todo: `POST /api/todos/`. */
export async function createTodo(input: TodoInput): Promise<Todo> {
  const data = await apiFetch<unknown>("/api/todos/", {
    method: "POST",
    json: input,
  });
  return todoSchema.parse(data);
}

/** Edits a todo: `PATCH /api/todos/<id>/`. */
export async function updateTodo(
  todoId: number,
  input: TodoInput,
): Promise<Todo> {
  const data = await apiFetch<unknown>(`/api/todos/${todoId}/`, {
    method: "PATCH",
    json: input,
  });
  return todoSchema.parse(data);
}

/** Deletes a todo: `DELETE /api/todos/<id>/`. */
export async function deleteTodo(todoId: number): Promise<void> {
  await apiFetch<undefined>(`/api/todos/${todoId}/`, { method: "DELETE" });
}

/**
 * Completes or reopens a todo: `POST /api/todos/<id>/complete/` or
 * `POST /api/todos/<id>/reopen/`.
 */
export async function setTodoCompleted(
  todoId: number,
  completed: boolean,
): Promise<Todo> {
  const action = completed ? "complete" : "reopen";
  const data = await apiFetch<unknown>(`/api/todos/${todoId}/${action}/`, {
    method: "POST",
  });
  return todoSchema.parse(data);
}

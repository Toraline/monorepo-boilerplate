import { z } from "zod";

import { apiFetch, listQuery, pagedSchema, type Paged } from "@repo/shared/api";

import { tagSchema } from "@/features/tags";
import { userSchema } from "@/features/users";

/** A todo of any user, with its owner, as `GET /api/admin/todos/` returns it. */
export const adminTodoSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string(),
  completed: z.boolean(),
  tags: z.array(tagSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
  owner: userSchema,
});

export type AdminTodo = z.infer<typeof adminTodoSchema>;

const adminTodoPageSchema = pagedSchema(adminTodoSchema);

export type AdminTodoFilters = {
  /** The id of a user: only the todos of this user. `null`: all users. */
  ownerId: number | null;
  /** The id of a tag: only the todos that have it. `null`: all. */
  tagId: number | null;
  /** `true`: only completed. `false`: only not completed. `null`: all. */
  completed: boolean | null;
  /** The number of the page. The first page is 1. */
  page: number;
};

/**
 * One page of the todos of all users, newest first: `GET /api/admin/todos/`.
 * The request only reads: this app has no request that changes a todo.
 */
export async function fetchAdminTodos(
  filters: AdminTodoFilters,
): Promise<Paged<AdminTodo>> {
  const query = listQuery({
    owner: filters.ownerId,
    tag: filters.tagId,
    completed: filters.completed,
    page: filters.page,
  });
  const data = await apiFetch<unknown>(`/api/admin/todos/${query}`);
  return adminTodoPageSchema.parse(data);
}

import { z } from "zod";

import { apiFetch, listQuery, pagedSchema, type Paged } from "@repo/shared/api";

import { userSchema } from "@/features/users";

/** The kinds of change of a todo, in the order of the filter. */
export const HISTORY_KINDS = [
  "created",
  "edited",
  "completed",
  "reopened",
  "deleted",
] as const;

export type HistoryKind = (typeof HISTORY_KINDS)[number];

/**
 * One history entry: the record of one change of a todo. `todoTitle` is the
 * title right after the change; the entry of a deleted todo keeps the title
 * that the todo had.
 */
export const historyEntrySchema = z.object({
  id: z.number(),
  kind: z.enum(HISTORY_KINDS),
  createdAt: z.string(),
  todoId: z.number(),
  todoTitle: z.string(),
  todoOwner: userSchema,
  user: userSchema,
});

export type HistoryEntry = z.infer<typeof historyEntrySchema>;

const historyPageSchema = pagedSchema(historyEntrySchema);

export type HistoryFilters = {
  /** The id of the user who made the change. `null`: all users. */
  userId: number | null;
  /** The kind of change. `null`: all kinds. */
  kind: HistoryKind | null;
  /** The number of the page. The first page is 1. */
  page: number;
};

/**
 * One page of the history entries of the todos of all users, newest first:
 * `GET /api/admin/history/`.
 */
export async function fetchHistory(
  filters: HistoryFilters,
): Promise<Paged<HistoryEntry>> {
  const query = listQuery({
    user: filters.userId,
    kind: filters.kind,
    page: filters.page,
  });
  const data = await apiFetch<unknown>(`/api/admin/history/${query}`);
  return historyPageSchema.parse(data);
}

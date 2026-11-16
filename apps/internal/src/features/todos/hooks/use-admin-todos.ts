"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchAdminTodos, type AdminTodoFilters } from "../api/todos";

/** The start of the key of every todo list in the TanStack Query client. */
export const adminTodosQueryKey = ["admin-todos"] as const;

/** One page of the todos of all users, for the given filters. */
export function useAdminTodos(filters: AdminTodoFilters) {
  return useQuery({
    queryKey: [...adminTodosQueryKey, filters],
    queryFn: () => fetchAdminTodos(filters),
  });
}

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createTodo,
  deleteTodo,
  fetchTodos,
  setTodoCompleted,
  updateTodo,
  type TodoFilters,
  type TodoInput,
} from "../api/todos";

/** The start of the key of every todo list in the TanStack Query client. */
export const todosQueryKey = ["todos"] as const;

/** One page of the todos of the user, for the given filters. */
export function useTodos(filters: TodoFilters) {
  return useQuery({
    queryKey: [...todosQueryKey, filters],
    queryFn: () => fetchTodos(filters),
  });
}

/**
 * Asks the server for the lists again after a change. The change counts as
 * running until the new list is there, so a dialog closes on the new list.
 */
function useReloadTodos() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: todosQueryKey });
}

export function useCreateTodo() {
  const reloadTodos = useReloadTodos();
  return useMutation({ mutationFn: createTodo, onSuccess: reloadTodos });
}

export function useUpdateTodo() {
  const reloadTodos = useReloadTodos();
  return useMutation({
    mutationFn: ({ todoId, input }: { todoId: number; input: TodoInput }) =>
      updateTodo(todoId, input),
    onSuccess: reloadTodos,
  });
}

export function useDeleteTodo() {
  const reloadTodos = useReloadTodos();
  return useMutation({ mutationFn: deleteTodo, onSuccess: reloadTodos });
}

export function useSetTodoCompleted() {
  const reloadTodos = useReloadTodos();
  return useMutation({
    mutationFn: ({
      todoId,
      completed,
    }: {
      todoId: number;
      completed: boolean;
    }) => setTodoCompleted(todoId, completed),
    onSuccess: reloadTodos,
  });
}

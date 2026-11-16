"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchUsers } from "../api/users";

/** The key of the list of the users in the TanStack Query client. */
export const usersQueryKey = ["users"] as const;

/** The users, for the choices of a filter. */
export function useUsers() {
  return useQuery({ queryKey: usersQueryKey, queryFn: fetchUsers });
}

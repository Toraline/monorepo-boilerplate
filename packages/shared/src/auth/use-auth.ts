"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  fetchCurrentUser,
  login,
  logout,
  type Credentials,
  type CurrentUser,
} from "./user";

/** The key of the "who am I" answer in the TanStack Query client. */
export const currentUserQueryKey = ["auth", "me"] as const;

/**
 * The user who is logged in. `data` is the user, or `null` when nobody is
 * logged in. `isError` is true when the server did not say which one it is.
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: currentUserQueryKey,
    queryFn: fetchCurrentUser,
    retry: false,
  });
}

/** Logs a user in. After it, `useCurrentUser` returns the user. */
export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation<CurrentUser, Error, Credentials>({
    mutationFn: login,
    onSuccess: (user) => {
      queryClient.setQueryData(currentUserQueryKey, user);
    },
  });
}

/**
 * Ends the login. After it, `useCurrentUser` returns `null`, and every answer
 * that the pages kept for the user is forgotten.
 */
export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, void>({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(currentUserQueryKey, null);
      queryClient.removeQueries({
        predicate: (query) => query.queryKey[0] !== currentUserQueryKey[0],
      });
    },
  });
}

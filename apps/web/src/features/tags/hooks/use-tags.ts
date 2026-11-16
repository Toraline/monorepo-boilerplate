"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchTags } from "../api/tags";

/** The key of the list of the tags in the TanStack Query client. */
export const tagsQueryKey = ["tags"] as const;

/** The tags that all users share. A user chooses from them and cannot change them. */
export function useTags() {
  return useQuery({ queryKey: tagsQueryKey, queryFn: fetchTags });
}

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createTag,
  deleteTag,
  fetchTags,
  updateTag,
  type TagInput,
} from "../api/tags";

/** The key of the list of the tags in the TanStack Query client. */
export const tagsQueryKey = ["tags"] as const;

/** The tags, each with the number of todos that have it. */
export function useTags() {
  return useQuery({ queryKey: tagsQueryKey, queryFn: fetchTags });
}

/**
 * Asks the server for the tags again after a change. The change counts as
 * running until the new list is there, so a dialog closes on the new list.
 * A change of a tag also changes the todos that have it: every other list is
 * marked as old, and is asked again when its page is opened.
 */
function useReloadTags() {
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.invalidateQueries({ queryKey: tagsQueryKey });
    void queryClient.invalidateQueries({
      predicate: (query) =>
        query.queryKey[0] !== tagsQueryKey[0] && query.queryKey[0] !== "auth",
    });
  };
}

export function useCreateTag() {
  const reloadTags = useReloadTags();
  return useMutation({ mutationFn: createTag, onSuccess: reloadTags });
}

export function useUpdateTag() {
  const reloadTags = useReloadTags();
  return useMutation({
    mutationFn: ({ tagId, input }: { tagId: number; input: TagInput }) =>
      updateTag(tagId, input),
    onSuccess: reloadTags,
  });
}

export function useDeleteTag() {
  const reloadTags = useReloadTags();
  return useMutation({ mutationFn: deleteTag, onSuccess: reloadTags });
}

import { z } from "zod";

import { apiFetch, pagedSchema } from "@repo/shared/api";

/** A tag as every request returns it. */
export const tagSchema = z.object({
  id: z.number(),
  name: z.string(),
  color: z.string(),
});

export type Tag = z.infer<typeof tagSchema>;

/** A tag of the list for an admin: with the number of todos that have it. */
export const tagWithCountSchema = tagSchema.extend({
  todoCount: z.number(),
});

export type TagWithCount = z.infer<typeof tagWithCountSchema>;

const tagPageSchema = pagedSchema(tagWithCountSchema);

/** What the form of a tag sends. */
export type TagInput = {
  name: string;
  color: string;
};

/**
 * The tags, ordered by name, each with the number of todos of all users that
 * have it: `GET /api/tags/`. One request asks for up to 100 tags, the most
 * that the server gives at once.
 */
export async function fetchTags(): Promise<TagWithCount[]> {
  const data = await apiFetch<unknown>("/api/tags/?pageSize=100");
  return tagPageSchema.parse(data).results;
}

/** Creates a tag: `POST /api/tags/`. */
export async function createTag(input: TagInput): Promise<Tag> {
  const data = await apiFetch<unknown>("/api/tags/", {
    method: "POST",
    json: input,
  });
  return tagSchema.parse(data);
}

/** Renames a tag, changes its color, or both: `PATCH /api/tags/<id>/`. */
export async function updateTag(tagId: number, input: TagInput): Promise<Tag> {
  const data = await apiFetch<unknown>(`/api/tags/${tagId}/`, {
    method: "PATCH",
    json: input,
  });
  return tagSchema.parse(data);
}

/** Deletes a tag: `DELETE /api/tags/<id>/`. The todos that had it stay. */
export async function deleteTag(tagId: number): Promise<void> {
  await apiFetch<undefined>(`/api/tags/${tagId}/`, { method: "DELETE" });
}

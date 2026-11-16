import { z } from "zod";

import { apiFetch, pagedSchema } from "@repo/shared/api";

export const tagSchema = z.object({
  id: z.number(),
  name: z.string(),
  color: z.string(),
});

export type Tag = z.infer<typeof tagSchema>;

const tagPageSchema = pagedSchema(tagSchema);

/**
 * The tags that all users share, ordered by name: `GET /api/tags/`. One
 * request asks for up to 100 tags, the most that the server gives at once.
 */
export async function fetchTags(): Promise<Tag[]> {
  const data = await apiFetch<unknown>("/api/tags/?pageSize=100");
  return tagPageSchema.parse(data).results;
}

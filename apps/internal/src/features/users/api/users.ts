import { z } from "zod";

import { apiFetch, pagedSchema } from "@repo/shared/api";

/** A user in the short form that the requests for an admin return. */
export const userSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string(),
});

export type User = z.infer<typeof userSchema>;

const userPageSchema = pagedSchema(userSchema);

/**
 * The users, ordered by email: `GET /api/admin/users/`. One request asks for
 * up to 100 users, the most that the server gives at once. The filters of
 * the todos and of the history show them as choices.
 */
export async function fetchUsers(): Promise<User[]> {
  const data = await apiFetch<unknown>("/api/admin/users/?pageSize=100");
  return userPageSchema.parse(data).results;
}

/** The text that names a user in a list: the name and the email, or the email alone. */
export function userLabel(user: User): string {
  return user.name ? `${user.name} (${user.email})` : user.email;
}

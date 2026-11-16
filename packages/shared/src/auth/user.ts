import { z } from "zod";

import { apiFetch, isApiError } from "../api/client";

/** The user that the server returns for a login and for "who am I". */
export const currentUserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string(),
  isAdmin: z.boolean(),
});

export type CurrentUser = z.infer<typeof currentUserSchema>;

export type Credentials = {
  email: string;
  password: string;
};

/**
 * Asks the server who is logged in: `GET /api/auth/me/`.
 * Returns `null` when nobody is logged in (status 401). Every other failure
 * throws the `ApiError`.
 */
export async function fetchCurrentUser(): Promise<CurrentUser | null> {
  try {
    const data = await apiFetch<unknown>("/api/auth/me/");
    return currentUserSchema.parse(data);
  } catch (error) {
    if (isApiError(error) && error.status === 401) {
      return null;
    }
    throw error;
  }
}

/**
 * Logs a user in: `POST /api/auth/login/`. A wrong email or password throws an
 * `ApiError` with status 401.
 */
export async function login(credentials: Credentials): Promise<CurrentUser> {
  const data = await apiFetch<unknown>("/api/auth/login/", {
    method: "POST",
    json: credentials,
  });
  return currentUserSchema.parse(data);
}

/** Ends the login: `POST /api/auth/logout/`. */
export async function logout(): Promise<void> {
  try {
    await apiFetch<undefined>("/api/auth/logout/", { method: "POST" });
  } catch (error) {
    // Status 401: the login had already ended. The result is the same.
    if (isApiError(error) && error.status === 401) {
      return;
    }
    throw error;
  }
}

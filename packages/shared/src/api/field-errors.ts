import { isApiError } from "./client";

/**
 * True when the server refused the value of one field: the answer has status
 * 400 and its body names the field, for example `{"title": ["..."]}`.
 */
export function hasFieldError(error: unknown, field: string): boolean {
  if (!isApiError(error) || error.status !== 400) {
    return false;
  }
  const body = error.body;
  return typeof body === "object" && body !== null && field in body;
}

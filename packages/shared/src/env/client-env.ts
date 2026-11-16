import { z } from "zod";

const clientEnvSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.url(),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;

/** The address of the server on a local machine, used when the variable is not set. */
export const DEFAULT_API_BASE_URL = "http://localhost:8000";

let cached: ClientEnv | undefined;

/**
 * The environment variables that the code in the browser may read.
 * Next.js replaces `process.env.NEXT_PUBLIC_API_BASE_URL` with its value when
 * it builds the app, so the name must be written in full here.
 */
export function getClientEnv(): ClientEnv {
  if (!cached) {
    cached = clientEnvSchema.parse({
      NEXT_PUBLIC_API_BASE_URL:
        process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL,
    });
  }
  return cached;
}

/** Only for tests: forget the values that were read. */
export function resetClientEnvForTests(): void {
  cached = undefined;
}

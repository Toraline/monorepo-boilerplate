import { z } from "zod";

import type { TagInput } from "./tags";

/** The keys of the texts, in the group `tags.form`, that a field can show. */
export type TagFormErrorKey =
  | "nameRequired"
  | "nameTooLong"
  | "nameExists"
  | "colorInvalid";

export type TagFormErrors = {
  name?: TagFormErrorKey;
  color?: TagFormErrorKey;
};

/** The color of a new tag until the admin chooses one. */
export const DEFAULT_TAG_COLOR = "#6D28D9";

/** True for a color in the form `#RRGGBB`, the only form the server takes. */
export function isTagColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

// The limits of the server (apps/api/README.md). Spaces around a value are
// removed, as the server does. The color is sent in upper case, as the
// server stores it.
const tagFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "nameRequired" satisfies TagFormErrorKey)
    .max(50, "nameTooLong" satisfies TagFormErrorKey),
  color: z
    .string()
    .trim()
    .refine(isTagColor, "colorInvalid" satisfies TagFormErrorKey)
    .transform((color) => color.toUpperCase()),
});

export type TagFormResult =
  | { valid: true; input: TagInput }
  | { valid: false; errors: TagFormErrors };

/** Checks what an admin typed into the form of a tag, before it is sent. */
export function validateTagForm(values: TagInput): TagFormResult {
  const result = tagFormSchema.safeParse(values);
  if (result.success) {
    return { valid: true, input: result.data };
  }
  const errors: TagFormErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if ((field === "name" || field === "color") && !errors[field]) {
      errors[field] = issue.message as TagFormErrorKey;
    }
  }
  return { valid: false, errors };
}

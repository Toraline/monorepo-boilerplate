"use client";

import { useTranslations } from "next-intl";
import { useRef, useState, type FormEvent, type RefObject } from "react";

import { hasFieldError } from "@repo/shared/api";
import { Dialog } from "@repo/ui/components";
import { Button, Field, TextInput } from "@toraline.tech/ui";

import {
  DEFAULT_TAG_COLOR,
  isTagColor,
  validateTagForm,
  type TagFormErrors,
} from "../api/tag-form";
import type { TagWithCount } from "../api/tags";
import { useCreateTag, useUpdateTag } from "../hooks/use-tags";

type TagFormDialogProps = {
  /** The tag to edit. `null` creates a new tag. */
  tag: TagWithCount | null;
  /** Called when the dialog closes: after a save, and on cancel. */
  onClose: () => void;
  /** Where the focus goes when the control that opened the dialog is gone. */
  fallbackFocus?: RefObject<HTMLElement | null>;
};

/**
 * The form of a tag, in a dialog: a name and a color. The color is typed in
 * the form `#RRGGBB` or chosen with the color control next to the field. A
 * name that another tag has shows a message on the name field.
 */
export function TagFormDialog({
  tag,
  onClose,
  fallbackFocus,
}: TagFormDialogProps) {
  const t = useTranslations("tags.form");
  const [name, setName] = useState(tag?.name ?? "");
  const [color, setColor] = useState(tag?.color ?? DEFAULT_TAG_COLOR);
  const [errors, setErrors] = useState<TagFormErrors>({});
  const nameField = useRef<HTMLInputElement>(null);
  const colorField = useRef<HTMLInputElement>(null);
  const createRequest = useCreateTag();
  const updateRequest = useUpdateTag();
  const saveRequest = tag ? updateRequest : createRequest;

  // What the server refused. A name that it refuses after the checks of the
  // browser is a name that another tag has.
  const nameRefused = hasFieldError(saveRequest.error, "name");
  const colorRefused = hasFieldError(saveRequest.error, "color");
  const nameErrorKey = nameRefused ? "nameExists" : errors.name;
  const colorErrorKey = colorRefused ? "colorInvalid" : errors.color;
  const saveFailed = saveRequest.isError && !nameRefused && !colorRefused;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateTagForm({ name, color });
    if (!result.valid) {
      setErrors(result.errors);
      const firstWrongField = result.errors.name ? nameField : colorField;
      firstWrongField.current?.focus();
      return;
    }
    setErrors({});
    const saveOptions = { onSuccess: onClose };
    if (tag) {
      updateRequest.mutate({ tagId: tag.id, input: result.input }, saveOptions);
    } else {
      createRequest.mutate(result.input, saveOptions);
    }
  }

  return (
    <Dialog
      open
      title={tag ? t("editTitle") : t("createTitle")}
      onClose={onClose}
      fallbackFocus={fallbackFocus}
    >
      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        {saveFailed ? (
          <p
            role="alert"
            className="m-0 rounded-md border border-error bg-error p-3 text-error"
          >
            {t("failed")}
          </p>
        ) : null}
        <Field
          label={t("nameLabel")}
          error={nameErrorKey ? t(nameErrorKey) : undefined}
        >
          <TextInput
            ref={nameField}
            name="name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <div className="flex items-start gap-3">
          <Field
            label={t("colorLabel")}
            error={colorErrorKey ? t(colorErrorKey) : undefined}
            className="flex-1"
          >
            <TextInput
              ref={colorField}
              name="color"
              required
              value={color}
              onChange={(event) => setColor(event.target.value)}
            />
          </Field>
          <input
            type="color"
            aria-label={t("colorPicker")}
            value={isTagColor(color) ? color.toLowerCase() : "#000000"}
            onChange={(event) => setColor(event.target.value.toUpperCase())}
            className="mt-6.5 h-12 w-14 flex-none lg:h-10 cursor-pointer rounded-md border border-default bg-surface p-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          />
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button type="submit" loading={saveRequest.isPending}>
            {t("save")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

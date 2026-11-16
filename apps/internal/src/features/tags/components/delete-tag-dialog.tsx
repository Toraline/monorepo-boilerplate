"use client";

import { useTranslations } from "next-intl";
import type { RefObject } from "react";

import { Dialog } from "@repo/ui/components";
import { Button } from "@toraline.tech/ui";

import type { TagWithCount } from "../api/tags";
import { useDeleteTag } from "../hooks/use-tags";

type DeleteTagDialogProps = {
  /** The tag that the admin asked to delete. */
  tag: TagWithCount;
  /** Called when the dialog closes: after the delete, and on cancel. */
  onClose: () => void;
  /** Where the focus goes after the delete: the button of the row is gone. */
  fallbackFocus?: RefObject<HTMLElement | null>;
};

/**
 * Asks for a confirmation before a tag is deleted, and says how many todos
 * use the tag. The focus starts on "Cancel", so the Enter key alone deletes
 * nothing.
 */
export function DeleteTagDialog({
  tag,
  onClose,
  fallbackFocus,
}: DeleteTagDialogProps) {
  const t = useTranslations("tags.delete");
  const deleteRequest = useDeleteTag();

  return (
    <Dialog
      open
      title={t("title", { name: tag.name })}
      onClose={onClose}
      fallbackFocus={fallbackFocus}
    >
      <p className="m-0 text-body">{t("usage", { count: tag.todoCount })}</p>
      <p className="m-0 text-body">{t("warning")}</p>
      {deleteRequest.isError ? (
        <p
          role="alert"
          className="m-0 rounded-md border border-error bg-error p-3 text-error"
        >
          {t("failed")}
        </p>
      ) : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          {t("cancel")}
        </Button>
        <Button
          variant="danger"
          loading={deleteRequest.isPending}
          onClick={() => deleteRequest.mutate(tag.id, { onSuccess: onClose })}
        >
          {t("confirm")}
        </Button>
      </div>
    </Dialog>
  );
}

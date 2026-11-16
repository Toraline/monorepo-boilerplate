"use client";

import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

import { StateMessage } from "@repo/ui/components";
import { Button } from "@toraline.tech/ui";

import type { TagWithCount } from "../api/tags";
import { useTags } from "../hooks/use-tags";
import { DeleteTagDialog } from "./delete-tag-dialog";
import { TagFormDialog } from "./tag-form-dialog";

type FormTarget = { tag: TagWithCount | null };

const HEADER_CELL = "border-b border-default p-3 text-left text-sm font-medium text-strong";
const CELL = "border-b border-default p-3 align-middle";

/**
 * The page of the tags: a table with the name, the color and the number of
 * todos of each tag, and the dialogs that create, edit and delete a tag.
 */
export function TagManager() {
  const t = useTranslations("tags");
  const tags = useTags();
  const [formTarget, setFormTarget] = useState<FormTarget | null>(null);
  const [tagToDelete, setTagToDelete] = useState<TagWithCount | null>(null);
  const newTagButton = useRef<HTMLButtonElement>(null);

  function renderTable() {
    if (tags.isPending) {
      return <StateMessage kind="loading">{t("loading")}</StateMessage>;
    }
    if (tags.isError) {
      return (
        <StateMessage
          kind="error"
          action={
            <Button
              variant="secondary"
              loading={tags.isFetching}
              onClick={() => tags.refetch()}
            >
              {t("tryAgain")}
            </Button>
          }
        >
          {t("failed")}
        </StateMessage>
      );
    }
    if (tags.data.length === 0) {
      return <StateMessage kind="empty">{t("empty")}</StateMessage>;
    }
    return (
      <div className="overflow-x-auto rounded-md border border-default bg-surface">
        <table className="w-full border-collapse">
          <caption className="sr-only">{t("table.caption")}</caption>
          <thead>
            <tr>
              <th scope="col" className={HEADER_CELL}>
                {t("table.name")}
              </th>
              <th scope="col" className={HEADER_CELL}>
                {t("table.color")}
              </th>
              <th scope="col" className={HEADER_CELL}>
                {t("table.todoCount")}
              </th>
              <th scope="col" className={HEADER_CELL}>
                {t("table.actions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {tags.data.map((tag) => (
              <tr key={tag.id}>
                <th scope="row" className={`${CELL} text-left font-medium`}>
                  {tag.name}
                </th>
                <td className={CELL}>
                  <span className="inline-flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      data-slot="tag-color"
                      className="size-4 flex-none rounded-full border border-strong"
                      style={{ backgroundColor: tag.color }}
                    />
                    {tag.color}
                  </span>
                </td>
                <td className={CELL}>{tag.todoCount}</td>
                <td className={CELL}>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      aria-label={t("actions.editName", { name: tag.name })}
                      onClick={() => setFormTarget({ tag })}
                    >
                      {t("actions.edit")}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      aria-label={t("actions.deleteName", { name: tag.name })}
                      onClick={() => setTagToDelete(tag)}
                    >
                      {t("actions.delete")}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="heading-page m-0 text-brand">{t("title")}</h1>
        <Button ref={newTagButton} onClick={() => setFormTarget({ tag: null })}>
          {t("new")}
        </Button>
      </div>
      {renderTable()}
      {formTarget ? (
        <TagFormDialog
          tag={formTarget.tag}
          onClose={() => setFormTarget(null)}
          fallbackFocus={newTagButton}
        />
      ) : null}
      {tagToDelete ? (
        <DeleteTagDialog
          tag={tagToDelete}
          onClose={() => setTagToDelete(null)}
          fallbackFocus={newTagButton}
        />
      ) : null}
    </main>
  );
}

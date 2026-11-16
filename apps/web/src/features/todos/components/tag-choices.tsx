"use client";

import { useTranslations } from "next-intl";

import { TagBadge } from "@repo/ui/components";

import { useTags } from "@/features/tags";

type TagChoicesProps = {
  /** The ids of the tags that are chosen. */
  selectedTagIds: number[];
  /** Called with the new list of ids when the person ticks or unticks a tag. */
  onChange: (tagIds: number[]) => void;
};

/**
 * The tags of a todo in its form: one checkbox per tag of the shared list.
 * The person chooses zero or more. A tag is only chosen here: this app has
 * no way to create, rename or delete one.
 */
export function TagChoices({ selectedTagIds, onChange }: TagChoicesProps) {
  const t = useTranslations("todos.form.tags");
  const tags = useTags();

  function toggleTag(tagId: number, checked: boolean) {
    const withoutTag = selectedTagIds.filter(
      (selectedTagId) => selectedTagId !== tagId,
    );
    onChange(checked ? [...withoutTag, tagId] : withoutTag);
  }

  function renderChoices() {
    if (tags.isPending) {
      return <p className="m-0 text-sm text-secondary">{t("loading")}</p>;
    }
    if (tags.isError) {
      return (
        <p role="alert" className="m-0 text-sm text-danger">
          {t("failed")}
        </p>
      );
    }
    if (tags.data.length === 0) {
      return <p className="m-0 text-sm text-secondary">{t("empty")}</p>;
    }
    return (
      <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-2 p-0">
        {tags.data.map((tag) => (
          <li key={tag.id}>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                name="tagIds"
                value={tag.id}
                checked={selectedTagIds.includes(tag.id)}
                onChange={(event) => toggleTag(tag.id, event.target.checked)}
                className="size-4 accent-(--bg-primary) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              />
              <TagBadge name={tag.name} color={tag.color} />
            </label>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
      <legend className="mb-1 p-0 text-sm/normal font-medium text-strong">
        {t("label")}
      </legend>
      {renderChoices()}
    </fieldset>
  );
}

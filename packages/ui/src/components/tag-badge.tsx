export type TagBadgeProps = {
  /** The name of the tag. It is always shown: the color alone never tells tags apart. */
  name: string;
  /** The color of the tag, in the form `#RRGGBB`. */
  color: string;
};

/**
 * One tag: a dot in the color of the tag, and its name. The dot is a
 * decoration, hidden from a screen reader; the name is the text.
 */
export function TagBadge({ name, color }: TagBadgeProps) {
  return (
    <span
      data-slot="tag"
      className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-default bg-subtle px-2 py-0.5 text-sm text-primary"
    >
      <span
        aria-hidden="true"
        data-slot="tag-color"
        className="size-2.5 flex-none rounded-full border border-strong"
        style={{ backgroundColor: color }}
      />
      <span className="truncate">{name}</span>
    </span>
  );
}

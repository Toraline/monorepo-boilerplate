import { useId, type ComponentProps, type ReactNode } from "react";

export type SelectOption = {
  /** The value that the choice has in the code. */
  value: string;
  /** The text of the choice. */
  label: string;
};

export type SelectFieldProps = Omit<ComponentProps<"select">, "children"> & {
  /** The visible name of the field, shown above it and linked to it. */
  label: ReactNode;
  /** The choices, in the order they are shown. */
  options: readonly SelectOption[];
};

/**
 * A list of choices with a label: a real `<select>`, so it works with the
 * keyboard and a screen reader as every select does. It was written when the
 * library had no select. Since version 0.2.0 the library has `Select`, which
 * goes inside `Field`. "className" goes to the
 * outermost element; every other prop goes to the `<select>`.
 */
export function SelectField({
  label,
  options,
  id,
  className = "",
  ...selectProps
}: SelectFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;

  return (
    <div className={`flex flex-col gap-1 font-body ${className}`}>
      <label htmlFor={fieldId} className="text-sm/normal font-medium text-strong">
        {label}
      </label>
      <select
        {...selectProps}
        id={fieldId}
        className="w-full rounded-md border border-default bg-surface p-3 text-base/normal text-primary hover:border-hover focus-visible:border-focus focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:bg-subtle disabled:text-tertiary"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

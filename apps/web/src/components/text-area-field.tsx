import { useId, type ComponentProps, type ReactNode } from "react";

type TextAreaFieldProps = ComponentProps<"textarea"> & {
  /** The visible name of the field, shown above it and linked to it. */
  label: ReactNode;
  /** The error message, shown under the field and read with it. */
  error?: ReactNode;
};

/**
 * A text field with several lines, a label and an error message. It was
 * written when the library had no field with several lines. Since version
 * 0.2.0 the library has `Textarea`, which goes inside `Field`.
 */
export function TextAreaField({
  label,
  error,
  id,
  className = "",
  ...textAreaProps
}: TextAreaFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const errorId = `${fieldId}-error`;

  return (
    <div className={`flex flex-col gap-1 font-body ${className}`}>
      <label htmlFor={fieldId} className="text-sm/normal font-medium text-strong">
        {label}
      </label>
      <textarea
        rows={4}
        {...textAreaProps}
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="w-full rounded-md border border-default bg-surface p-3 text-base/normal text-primary hover:border-hover focus-visible:border-focus focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus aria-invalid:border-invalid"
      />
      {error ? (
        <p id={errorId} className="m-0 text-sm/normal text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

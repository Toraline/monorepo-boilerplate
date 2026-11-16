import { themeInputs } from "@repo/ui/theme";
import { Button, Field, TextInput, Toggle } from "@toraline.tech/ui";

/** The names of every color that at least one theme of the project sets, in the order of the first theme. */
function changedColorNames(): string[] {
  const names = themeInputs.flatMap((themeInput) =>
    Object.keys(themeInput.colors ?? {}),
  );
  return [...new Set(names)];
}

/**
 * A table with one row for each color token that this project sets in
 * packages/ui/src/theme/theme-config.ts, and one column for each theme. It
 * reads the file, so a changed value shows here with no change in the catalog.
 */
export function ChangedTokensTable() {
  return (
    <table className="w-full border-collapse text-sm text-primary">
      <thead>
        <tr>
          <th className="border-b border-default p-2 text-left">Token</th>
          {themeInputs.map((themeInput) => (
            <th
              key={themeInput.name}
              className="border-b border-default p-2 text-left"
            >
              {themeInput.name}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {changedColorNames().map((colorName) => (
          <tr key={colorName}>
            <td className="border-b border-default p-2 font-mono">
              --{colorName}
            </td>
            {themeInputs.map((themeInput) => {
              const colors: Record<string, string | undefined> =
                themeInput.colors ?? {};
              const value = colors[colorName];
              return (
                <td
                  key={themeInput.name}
                  className="border-b border-default p-2"
                >
                  {value ? <ColorValue value={value} /> : "the value of the library"}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ColorValue({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center gap-2 font-mono">
      <span
        aria-hidden="true"
        data-slot="swatch"
        className="size-5 flex-none rounded-sm border border-strong"
        style={{ backgroundColor: value }}
      />
      {value}
    </span>
  );
}

/**
 * A small piece of a screen that uses the tokens the project sets: the main
 * color as a background, as a text and as a border, and the pale backgrounds.
 * It follows the theme of the toolbar.
 */
export function ThemeSample() {
  return (
    <div className="flex max-w-md flex-col gap-4 rounded-lg border border-default bg-surface p-6 text-primary">
      <h2 className="heading-section m-0 text-brand">The theme of this project</h2>
      <p className="m-0 text-secondary">
        The heading has the color of the token text-brand. The button has the
        background of the token bg-primary.
      </p>
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        <li className="rounded-md p-2">A row</li>
        <li className="rounded-md border border-brand bg-selected p-2">
          A selected row: bg-selected and border-brand
        </li>
        <li className="rounded-md bg-primary-muted p-2">
          A row with the background bg-primary-muted
        </li>
      </ul>
      <Field label="A field: press Tab to see border-focus">
        <TextInput name="sample" />
      </Field>
      <Toggle label="A switch" name="sample-switch" defaultChecked />
      <div className="flex gap-3">
        <Button>Main action</Button>
        <Button variant="secondary">Another action</Button>
      </div>
    </div>
  );
}

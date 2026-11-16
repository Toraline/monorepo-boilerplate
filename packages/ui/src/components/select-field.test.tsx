import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SelectField } from "./select-field";

const options = [
  { value: "", label: "All tags" },
  { value: "2", label: "Home" },
  { value: "1", label: "Work" },
];

describe("SelectField", () => {
  it("is a select with its label and its choices", () => {
    render(<SelectField label="Tag" options={options} defaultValue="" />);

    const select = screen.getByRole("combobox", { name: "Tag" });
    expect(select).toHaveValue("");
    expect(
      screen.getAllByRole("option").map((option) => option.textContent),
    ).toEqual(["All tags", "Home", "Work"]);
  });

  it("shows the given value and tells the app the new one", () => {
    const onChange = vi.fn();
    render(
      <SelectField label="Tag" options={options} value="2" onChange={onChange} />,
    );

    const select = screen.getByLabelText("Tag");
    expect(select).toHaveValue("2");
    fireEvent.change(select, { target: { value: "1" } });

    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

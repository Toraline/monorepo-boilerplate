import type { Meta, StoryObj } from "@storybook/react-vite";
import { SelectField } from "@repo/ui/components";

const options = [
  { value: "", label: "All tags" },
  { value: "1", label: "Home" },
  { value: "2", label: "Work" },
  { value: "3", label: "Urgent" },
];

/** A list of choices with a label. It is a component of this project. Since version 0.2.0 the library has Select, which goes inside Field. */
const meta = {
  title: "Project/SelectField",
  component: SelectField,
  args: { label: "Tag", name: "tag", options },
} satisfies Meta<typeof SelectField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithAChoice: Story = {
  args: { defaultValue: "2" },
};

export const Disabled: Story = {
  args: { disabled: true },
};

import type { Meta, StoryObj } from "@storybook/react-vite";
import { Field, TextInput } from "@toraline.tech/ui";

/**
 * A field of a form, in the theme of this project: a label, one control, and
 * under it a hint or an error message, all tied together for a screen reader.
 */
const meta = {
  title: "Library/Field",
  component: Field,
  args: {
    label: "Title",
    children: <TextInput name="title" />,
  },
  argTypes: { children: { control: false } },
} satisfies Meta<typeof Field>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithHint: Story = {
  args: { hint: "At most 200 characters." },
};

/** The message is under the control, in the place of the hint, and the control has the red border. */
export const WithError: Story = {
  args: { hint: "At most 200 characters.", error: "Write a title." },
};

/** The label shows a mark. The prop "optionalText" gives the mark in another language. */
export const Optional: Story = {
  args: { optional: true },
};

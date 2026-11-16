import type { Meta, StoryObj } from "@storybook/react-vite";
import { TextInput, controlSizes } from "@toraline.tech/ui";

import { Row } from "../shared/row";

/**
 * A text field of one line, in the theme of this project. It has no label of
 * its own: inside a form it goes into Field. Alone, it needs "aria-label".
 */
const meta = {
  title: "Library/TextInput",
  component: TextInput,
  args: {
    "aria-label": "Title",
    name: "title",
  },
} satisfies Meta<typeof TextInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithPlaceholder: Story = {
  args: { placeholder: "For example: buy milk" },
};

export const WithValue: Story = {
  args: { defaultValue: "Buy milk" },
};

/** The red border of a field that is not valid. Field sets it when it has an error. */
export const NotValid: Story = {
  args: { "aria-invalid": true },
};

export const Disabled: Story = {
  args: { defaultValue: "Buy milk", disabled: true },
};

/** Every size, from the list "controlSizes" of the library. */
export const Sizes: Story = {
  render: (args) => (
    <Row>
      {controlSizes.map((size) => (
        <TextInput key={size} {...args} size={size} placeholder={size} />
      ))}
    </Row>
  ),
};

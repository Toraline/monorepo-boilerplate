import type { Meta, StoryObj } from "@storybook/react-vite";
import { Toggle } from "@toraline.tech/ui";

/** A switch with two states, in the theme of this project. */
const meta = {
  title: "Library/Toggle",
  component: Toggle,
  args: {
    label: "Show completed todos",
    name: "show-completed",
  },
} satisfies Meta<typeof Toggle>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Off: Story = {};

/** The background of the switch is the main color of this project. */
export const On: Story = {
  args: { defaultChecked: true },
};

export const DisabledOff: Story = {
  args: { disabled: true },
};

export const DisabledOn: Story = {
  args: { disabled: true, defaultChecked: true },
};

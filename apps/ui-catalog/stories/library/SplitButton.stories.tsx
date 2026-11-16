import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { SplitButton, splitButtonMenuPlacements } from "@toraline.tech/ui";

const items = [
  { label: "Save and add another", onSelect: fn() },
  { label: "Save as completed", onSelect: fn() },
];

/** A button with a main action, and a second button that opens a menu of other actions. */
const meta = {
  title: "Library/SplitButton",
  component: SplitButton,
  args: {
    children: "Save",
    items,
    onClick: fn(),
  },
  argTypes: {
    menuPlacement: {
      control: "inline-radio",
      options: [...splitButtonMenuPlacements],
    },
  },
  // The menu sits above the page content. This space keeps an open menu inside the story.
  decorators: [(Story) => <div className="py-24">{Story()}</div>],
} satisfies Meta<typeof SplitButton>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Press the small button at the right to open the menu. */
export const Default: Story = {};

export const Disabled: Story = {
  args: { disabled: true },
};

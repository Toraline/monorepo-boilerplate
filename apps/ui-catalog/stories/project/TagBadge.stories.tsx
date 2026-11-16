import type { Meta, StoryObj } from "@storybook/react-vite";
import { TagBadge } from "@repo/ui/components";

import { Row } from "../shared/row";

/** One tag of a todo: a dot in the color of the tag, and its name. */
const meta = {
  title: "Project/TagBadge",
  component: TagBadge,
  args: { name: "Home", color: "#2563EB" },
  argTypes: { color: { control: "color" } },
} satisfies Meta<typeof TagBadge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Several tags next to each other, as in a row of the todo list. */
export const Several: Story = {
  render: () => (
    <Row>
      <TagBadge name="Home" color="#2563EB" />
      <TagBadge name="Work" color="#16A34A" />
      <TagBadge name="Urgent" color="#DC2626" />
    </Row>
  ),
};

/** A long name is cut with "..." when the place is too narrow. */
export const LongName: Story = {
  args: { name: "A tag with a very long name that does not fit" },
  decorators: [(Story) => <div className="w-48">{Story()}</div>],
};

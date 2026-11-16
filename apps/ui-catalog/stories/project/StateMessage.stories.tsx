import type { Meta, StoryObj } from "@storybook/react-vite";
import { StateMessage } from "@repo/ui/components";
import { Button } from "@toraline.tech/ui";

/** A box that says the state of a list or a page: loading, empty or failed. */
const meta = {
  title: "Project/StateMessage",
  component: StateMessage,
  args: { kind: "loading", children: "Loading the todos." },
  argTypes: {
    kind: { control: "inline-radio", options: ["loading", "empty", "error"] },
    action: { control: false },
  },
} satisfies Meta<typeof StateMessage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Loading: Story = {};

export const Empty: Story = {
  args: { kind: "empty", children: "You have no todo yet." },
};

/** The state "error" with a control under the text. */
export const ErrorWithAction: Story = {
  args: {
    kind: "error",
    children: "The todos could not be loaded.",
    action: (
      <Button variant="secondary" size="sm">
        Try again
      </Button>
    ),
  },
};

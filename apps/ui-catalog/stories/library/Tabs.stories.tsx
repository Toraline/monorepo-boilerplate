import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Tabs } from "@toraline.tech/ui";

const todoTabs = [
  { id: "all", label: "All", content: <p>Every todo.</p> },
  { id: "open", label: "Not completed", content: <p>The todos that are not completed.</p> },
  { id: "completed", label: "Completed", content: <p>The completed todos.</p> },
];

/** A row of tabs, and under it the content of the selected tab. */
const meta = {
  title: "Library/Tabs",
  component: Tabs,
  args: {
    tabs: todoTabs,
    "aria-label": "Todos by state",
    onChange: fn(),
  },
} satisfies Meta<typeof Tabs>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The first tab is selected. The Left and Right arrow keys select another tab. */
export const Default: Story = {};

/** The prop "defaultValue" names the tab that is selected at the start. */
export const StartsOnAnotherTab: Story = {
  args: { defaultValue: "completed" },
};

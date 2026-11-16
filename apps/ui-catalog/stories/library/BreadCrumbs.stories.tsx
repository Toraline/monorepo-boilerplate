import type { Meta, StoryObj } from "@storybook/react-vite";
import { BreadCrumbs } from "@toraline.tech/ui";

// The addresses start with "#", so a press on a link does not leave the story.
const crumbs = [
  { label: "Internal app", href: "#internal" },
  { label: "Todos of all users", href: "#todos" },
  { label: "History" },
];

/** The path from the start page to the current page. */
const meta = {
  title: "Library/BreadCrumbs",
  component: BreadCrumbs,
  args: { crumbs },
} satisfies Meta<typeof BreadCrumbs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const OneStep: Story = {
  args: { crumbs: crumbs.slice(0, 1) },
};

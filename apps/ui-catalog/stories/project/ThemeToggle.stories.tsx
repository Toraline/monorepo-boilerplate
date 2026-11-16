import type { Meta, StoryObj } from "@storybook/react-vite";
import { ThemeToggle } from "@repo/ui/components";

/**
 * The button that changes the theme of the page. A press changes the theme of
 * the catalog too: the control "Theme" of the toolbar then names the new theme.
 */
const meta = {
  title: "Project/ThemeToggle",
  component: ThemeToggle,
  args: {
    labels: { light: "Theme: light", dark: "Theme: dark" },
    accessibleNames: {
      light: "Theme: light. Switch to dark.",
      dark: "Theme: dark. Switch to light.",
    },
  },
} satisfies Meta<typeof ThemeToggle>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

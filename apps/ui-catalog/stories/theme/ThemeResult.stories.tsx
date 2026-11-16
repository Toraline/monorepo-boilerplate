import type { Meta, StoryObj } from "@storybook/react-vite";

import { ChangedTokensTable, ThemeSample } from "./theme-result";

/**
 * The result of the theme of this project. The page "Theme / Change the
 * theme" shows these two stories under its steps.
 */
const meta = {
  title: "Theme/Result",
  // These stories are shown on the page "Change the theme". They need no
  // documentation page of their own.
  tags: ["!autodocs"],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

/** A small piece of a screen in the current theme. Change the theme with the control "Theme" of the toolbar. */
export const Sample: Story = {
  render: () => <ThemeSample />,
};

/** Every color token that this project sets, with its value in each theme. */
export const ChangedTokens: Story = {
  render: () => <ChangedTokensTable />,
};

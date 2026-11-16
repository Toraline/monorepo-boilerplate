import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Button, buttonSizes, buttonVariants } from "@toraline.tech/ui";

import { Row } from "../shared/row";

/**
 * The button of the library, in the theme of this project. The stories
 * "Variants" and "Sizes" read the lists of the library, so a new variant or
 * size appears here with no change in this file.
 */
const meta = {
  title: "Library/Button",
  component: Button,
  args: {
    children: "Save",
    // "fn" records each press, and the panel "Actions" shows it.
    onClick: fn(),
  },
  argTypes: {
    variant: { control: "select", options: [...buttonVariants] },
    size: { control: "select", options: [...buttonSizes] },
  },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The button with no prop. Its background is the main color of this project. */
export const Default: Story = {};

/** Every variant. A variant is one of the looks of the button. */
export const Variants: Story = {
  render: (args) => (
    <Row>
      {buttonVariants.map((variant) => (
        <Button {...args} key={variant} variant={variant}>
          {variant}
        </Button>
      ))}
    </Row>
  ),
};

/** Every size. */
export const Sizes: Story = {
  render: (args) => (
    <Row>
      {buttonSizes.map((size) => (
        <Button {...args} key={size} size={size}>
          Size {size}
        </Button>
      ))}
    </Row>
  ),
};

/** The state "disabled", in every variant. */
export const Disabled: Story = {
  args: { disabled: true },
  render: Variants.render,
};

/** The state "loading", in every variant: a spinner, and a press does nothing. */
export const Loading: Story = {
  args: { loading: true },
  render: Variants.render,
};

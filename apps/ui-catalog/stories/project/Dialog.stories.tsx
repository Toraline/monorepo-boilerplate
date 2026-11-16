import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Dialog } from "@repo/ui/components";
import { Button, Field, TextInput } from "@toraline.tech/ui";

/**
 * A dialog on top of the page, for a form or a confirmation. The Escape key
 * and a press outside it close it. The Tab key stays inside it.
 */
const meta = {
  title: "Project/Dialog",
  component: Dialog,
  args: {
    open: true,
    title: "Delete the todo",
    onClose: fn(),
    children: null,
  },
  argTypes: { children: { control: false }, fallbackFocus: { control: false } },
  parameters: {
    // On a documentation page each story is in its own frame, so an open
    // dialog covers only its frame and not the whole page.
    docs: { story: { inline: false, height: "420px" } },
  },
} satisfies Meta<typeof Dialog>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A confirmation: a text and two buttons. */
export const Confirmation: Story = {
  render: (args) => (
    <Dialog {...args}>
      <p className="m-0">Delete the todo &quot;Buy milk&quot;? This cannot be undone.</p>
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={args.onClose}>
          Cancel
        </Button>
        <Button variant="danger">Delete</Button>
      </div>
    </Dialog>
  ),
};

/** A form. On opening, the focus is in the first field. */
export const WithAForm: Story = {
  args: { title: "New todo" },
  render: (args) => (
    <Dialog {...args}>
      <Field label="Title">
        <TextInput name="title" />
      </Field>
      <Field label="Description">
        <TextInput name="description" />
      </Field>
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={args.onClose}>
          Cancel
        </Button>
        <Button>Save</Button>
      </div>
    </Dialog>
  ),
};

/** A button opens the dialog. After closing, the focus returns to that button. */
export const OpenedByAButton: Story = {
  args: { open: false, title: "New todo" },
  render: function DialogWithItsButton(args) {
    const [open, setOpen] = useState(false);

    return (
      <>
        <Button onClick={() => setOpen(true)}>New todo</Button>
        <Dialog {...args} open={open} onClose={() => setOpen(false)}>
          <Field label="Title">
            <TextInput name="title" />
          </Field>
          <div className="flex justify-end">
            <Button onClick={() => setOpen(false)}>Save</Button>
          </div>
        </Dialog>
      </>
    );
  },
};

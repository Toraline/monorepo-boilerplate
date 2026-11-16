import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { LoginForm } from "@repo/ui/components";

const labels = {
  email: "Email",
  password: "Password",
  submit: "Log in",
  emailRequired: "Write your email.",
  passwordRequired: "Write your password.",
};

/** The form of the login page of both apps. Press "Log in" with an empty field to see its message. */
const meta = {
  title: "Project/LoginForm",
  component: LoginForm,
  args: { labels, onSubmit: fn() },
  decorators: [(Story) => <div className="max-w-sm">{Story()}</div>],
} satisfies Meta<typeof LoginForm>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The message of the server, above the fields. */
export const WithError: Story = {
  args: { errorMessage: "The email or the password is not correct." },
};

/** While the login request runs. */
export const Pending: Story = {
  args: { pending: true },
};

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LoginForm, type LoginFormProps } from "./login-form";

const labels = {
  email: "Email",
  password: "Password",
  submit: "Log in",
  emailRequired: "Type your email.",
  passwordRequired: "Type your password.",
};

function renderForm(props: Partial<LoginFormProps> = {}) {
  const onSubmit = vi.fn();
  render(<LoginForm labels={labels} onSubmit={onSubmit} {...props} />);
  return { onSubmit };
}

function type(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

describe("LoginForm", () => {
  it("sends the email and the password", () => {
    const { onSubmit } = renderForm();

    type("Email", " ana.lima@example.com ");
    type("Password", "sample-password");
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));

    expect(onSubmit).toHaveBeenCalledWith({
      email: "ana.lima@example.com",
      password: "sample-password",
    });
  });

  it("has a submit button, so the Enter key sends the form", () => {
    renderForm();

    expect(screen.getByRole("button", { name: "Log in" })).toHaveAttribute(
      "type",
      "submit",
    );
  });

  it("shows a message on each empty field, moves the focus to the first one, and sends nothing", () => {
    const { onSubmit } = renderForm();

    fireEvent.click(screen.getByRole("button", { name: "Log in" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Email")).toHaveAccessibleDescription(
      "Type your email.",
    );
    expect(screen.getByLabelText("Email")).toBeInvalid();
    expect(screen.getByLabelText("Password")).toHaveAccessibleDescription(
      "Type your password.",
    );
    expect(screen.getByLabelText("Email")).toHaveFocus();
  });

  it("moves the focus to the password when only the password is empty", () => {
    renderForm();

    type("Email", "ana.lima@example.com");
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));

    expect(screen.getByLabelText("Password")).toHaveFocus();
    expect(screen.getByLabelText("Email")).toBeValid();
  });

  it("shows one error message as an alert, and the fields keep what was typed", () => {
    const onSubmit = vi.fn();
    const { rerender } = render(
      <LoginForm labels={labels} onSubmit={onSubmit} />,
    );
    type("Email", "ana.lima@example.com");
    type("Password", "wrong-password");
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);

    rerender(
      <LoginForm
        labels={labels}
        onSubmit={onSubmit}
        errorMessage="The email or the password is not correct."
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "The email or the password is not correct.",
    );
    expect(screen.getByLabelText("Email")).toHaveValue("ana.lima@example.com");
    expect(screen.getByLabelText("Password")).toHaveValue("wrong-password");
  });

  it("marks the button as busy while the login runs", () => {
    renderForm({ pending: true });

    expect(screen.getByRole("button", { name: "Log in" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
  });
});

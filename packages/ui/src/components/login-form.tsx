"use client";

import { Button, Field, TextInput } from "@toraline.tech/ui";
import { useRef, useState, type FormEvent } from "react";

export type LoginFormLabels = {
  /** The name of the email field. */
  email: string;
  /** The name of the password field. */
  password: string;
  /** The text of the button that sends the form. */
  submit: string;
  /** The message under the email field when it is empty. */
  emailRequired: string;
  /** The message under the password field when it is empty. */
  passwordRequired: string;
};

export type LoginFormProps = {
  labels: LoginFormLabels;
  /**
   * One message above the fields, for example "The email or the password is
   * not correct." The fields keep what the person typed.
   */
  errorMessage?: string;
  /** true while the login request runs. */
  pending?: boolean;
  /** Called with the email and the password when both fields are filled. */
  onSubmit: (credentials: { email: string; password: string }) => void;
};

/**
 * The form of the login page of both apps: an email, a password and one
 * button. It is built from `Field`, `TextInput` and `Button` of the library, so it works
 * with the keyboard only: Tab moves between the fields, Enter sends the form.
 * An empty field gets a message that is tied to it, and the focus moves to
 * the first such field. This package holds no text: the app gives the texts.
 */
export function LoginForm({
  labels,
  errorMessage,
  pending = false,
  onSubmit,
}: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showMissing, setShowMissing] = useState(false);
  const emailField = useRef<HTMLInputElement>(null);
  const passwordField = useRef<HTMLInputElement>(null);

  const emailMissing = email.trim() === "";
  const passwordMissing = password === "";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (emailMissing || passwordMissing) {
      setShowMissing(true);
      const firstEmptyField = emailMissing ? emailField : passwordField;
      firstEmptyField.current?.focus();
      return;
    }
    onSubmit({ email: email.trim(), password });
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      {errorMessage ? (
        <p
          role="alert"
          className="m-0 rounded-md border border-error bg-error p-3 text-error"
        >
          {errorMessage}
        </p>
      ) : null}
      <Field
        label={labels.email}
        error={showMissing && emailMissing ? labels.emailRequired : undefined}
      >
        <TextInput
          ref={emailField}
          type="email"
          name="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </Field>
      <Field
        label={labels.password}
        error={
          showMissing && passwordMissing ? labels.passwordRequired : undefined
        }
      >
        <TextInput
          ref={passwordField}
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </Field>
      <Button type="submit" loading={pending} className="self-start">
        {labels.submit}
      </Button>
    </form>
  );
}

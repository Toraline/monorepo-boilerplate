"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { isApiError } from "@repo/shared/api";
import { useCurrentUser, useLogin } from "@repo/shared/auth";
import { LoginForm } from "@repo/ui/components";

type LoginScreenProps = {
  /** The page to show after the login. */
  nextPath: string;
};

// The statuses that mean "the email or the password is not correct": 401, and
// 400 when the server refuses the form of a value, for example of the email.
const WRONG_CREDENTIALS_STATUSES = [400, 401];

/**
 * The login page: a title and the login form. After a login, and when the
 * person is already logged in, it shows the page of `nextPath`.
 */
export function LoginScreen({ nextPath }: LoginScreenProps) {
  const t = useTranslations("auth.login");
  const router = useRouter();
  const currentUser = useCurrentUser();
  const loginRequest = useLogin();
  const isLoggedIn = Boolean(currentUser.data);

  useEffect(() => {
    if (isLoggedIn) {
      router.replace(nextPath);
    }
  }, [isLoggedIn, nextPath, router]);

  const wrongCredentials =
    isApiError(loginRequest.error) &&
    WRONG_CREDENTIALS_STATUSES.includes(loginRequest.error.status);
  const failureMessage = wrongCredentials
    ? t("wrongCredentials")
    : t("serverError");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 p-8">
      <h1 className="heading-page text-brand">{t("title")}</h1>
      <LoginForm
        labels={{
          email: t("email"),
          password: t("password"),
          submit: t("submit"),
          emailRequired: t("emailRequired"),
          passwordRequired: t("passwordRequired"),
        }}
        errorMessage={loginRequest.isError ? failureMessage : undefined}
        pending={loginRequest.isPending || isLoggedIn}
        onSubmit={(credentials) => loginRequest.mutate(credentials)}
      />
    </main>
  );
}

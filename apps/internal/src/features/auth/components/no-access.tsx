"use client";

import { useTranslations } from "next-intl";

import { useLogout, type CurrentUser } from "@repo/shared/auth";
import { Button } from "@toraline.tech/ui";

type NoAccessProps = {
  /** The user who is logged in and is not an admin. */
  user: CurrentUser;
};

/**
 * The only page that a user who is not an admin gets in this app: it says
 * that the user has no access, and has the logout button. After the logout
 * the login page appears.
 */
export function NoAccess({ user }: NoAccessProps) {
  const t = useTranslations("auth.noAccess");
  const logoutRequest = useLogout();

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-start justify-center gap-4 p-8">
      <h1 className="heading-page m-0 text-brand">{t("title")}</h1>
      <p className="m-0 text-body">{t("description", { email: user.email })}</p>
      <Button
        loading={logoutRequest.isPending}
        onClick={() => logoutRequest.mutate()}
      >
        {t("logout")}
      </Button>
      {logoutRequest.isError ? (
        <p role="alert" className="m-0 text-danger">
          {t("logoutFailed")}
        </p>
      ) : null}
    </main>
  );
}

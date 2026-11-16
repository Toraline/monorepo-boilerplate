"use client";

import { useTranslations } from "next-intl";

import { useCurrentUser, useLogout } from "@repo/shared/auth";
import { Button } from "@toraline.tech/ui";

/**
 * The name of the admin who is logged in and the logout button, at the top of
 * every page. It shows nothing when nobody is logged in, and nothing for a
 * user who is not an admin: the "no access" page has its own logout button.
 */
export function UserMenu() {
  const t = useTranslations("auth.userMenu");
  const currentUser = useCurrentUser();
  const logoutRequest = useLogout();
  const user = currentUser.data;

  if (!user?.isAdmin) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-secondary">
      <span>{t("loggedInAs", { name: user.name || user.email })}</span>
      <Button
        variant="secondary"
        size="sm"
        loading={logoutRequest.isPending}
        onClick={() => logoutRequest.mutate()}
      >
        {t("logout")}
      </Button>
      {logoutRequest.isError ? (
        <span role="alert" className="text-danger">
          {t("logoutFailed")}
        </span>
      ) : null}
    </div>
  );
}
